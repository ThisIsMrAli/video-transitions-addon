import React, { useEffect, useRef, useState } from "react";
import { aspectRatioAtom, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import {
  convertLottieToPngSequenceAndBurn,
  mergeVideos,
} from "../../../helpers/renderHelper";
import { downloadUint8ArrayAsMP4 } from "../../../helpers/utils";
import { Button } from "@adobe/react-spectrum";
import { ProgressBar } from "@adobe/react-spectrum";
import { useNavigate } from "react-router-dom";
import { ToastQueue } from "@react-spectrum/toast";
import AddOnSdkInstance from "../../../helpers/AddonSdk";

const Render = () => {
  const [layers, setLayers] = useAtom(layersAtom);
  const navigate = useNavigate();
  const [renderPercent, setRenderPercent] = useState(0);
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useAtom(aspectRatioAtom);
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Create new AbortController for this render
    abortControllerRef.current = new AbortController();

    const startRender = async () => {
      try {
        const VideoLayers = layers
          .filter((layer) => layer.assetType === "media")
          .map((layer) => ({
            name: layer.name,
            orgFile: layer.orgFile,
            changedTrims: layer.changedTrims,
            start: layer.start,
            end: layer.end,
          }));
        const TransitionLayers = layers
          .filter((layer) => layer.assetType == "transition")
          .map((layer) => layer.animationData);

        const { data, mergePoints } = await mergeVideos(
          VideoLayers,
          (progress) => {
            setRenderPercent((progress / 2) * 100);
          },
          selectedAspectRatio.width,
          selectedAspectRatio.height,
          abortControllerRef.current?.signal
        );

        const markerTime = layers[1].animationData.markers[0].tm * (1 / 30);
        const pointsToMerge = [];
        for (let i = 0; i < mergePoints.length - 1; i++) {
          if (mergePoints[i] > markerTime) {
            pointsToMerge.push(
              mergePoints[i] - TransitionLayers[i].markers[0].tm * (1 / 30)
            );
          }
        }

        const blob = await convertLottieToPngSequenceAndBurn(
          TransitionLayers,
          data,
          (progress) => {
            setRenderPercent(50 + (progress / 2) * 100);
          },
          pointsToMerge,
          selectedAspectRatio.width,
          selectedAspectRatio.height,
          abortControllerRef.current?.signal
        );

        const randomNum = Math.floor(Math.random() * 10000);
        // downloadUint8ArrayAsMP4(blob, `Video${randomNum}.mp4`);
        AddOnSdkInstance.app.document.addVideo(
          new Blob([blob], { type: "video/mp4" })
        );
        ToastQueue.positive("Render complete", { timeout: 3000 });
        navigate("/");
      } catch (error) {
        if (error.name === "AbortError") {
          console.log("Render was cancelled");
        } else {
          console.error("Render error:", error);
        }
      }
    };

    startRender();

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const onClose = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      ToastQueue.neutral("Render cancelled", { timeout: 3000 });
    }
    navigate("/");
  };

  useEffect(() => {
    console.log(layers);
  }, [layers]);

  return (
    <div className="flex justify-center items-center ">
      <div className="w-full rounded-[8px] bg-white flex flex-col py-[20px] items-center px-[20px] relative space-y-5">
        <h4 className="text-center font-bold text-[16px] text-[#545554] mb-[15px] leading-[15px]">
          Render in Progress...
        </h4>

        <ProgressBar
          size="L"
          label={
            renderPercent <= 50
              ? "Combining videos..."
              : "Adding transitions..."
          }
          minValue={0}
          maxValue={100}
          value={renderPercent}
          // isIndeterminate={renderStep === steps.FINALIZING}
        />
        <span className="text-center">
          Please wait until the render is complete...
        </span>
        <span className="text-center text-[12px]">
          Once rendering is complete, the video will be added to your document.
        </span>

        <Button
          onPress={onClose}
          style="fill"
          variant="secondary"
          alignSelf={"center"}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default Render;
