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

const Render = () => {
  const [layers, setLayers] = useAtom(layersAtom);

  const [renderPercent, setRenderPercent] = useState(0);
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useAtom(aspectRatioAtom);
  useEffect(() => {
    console.log(renderPercent);
  }, [renderPercent]);
  const onClose = () => {
    setRenderPercent(0);
  };

  useEffect(() => {
    console.log(layers);
    const VideoLayers = layers
      .filter((layer) => layer.assetType === "media")
      .map((layer) => ({
        orgFile: layer.orgFile,
        changedTrims: layer.changedTrims,
        start: layer.start,
        end: layer.end,
      }));
    const TransitionLayers = layers
      .filter((layer) => layer.assetType == "transition")
      .map((layer) => layer.animationData);
    console.log(layers[0].end, layers[0].end.toFixed(3));
    mergeVideos(
      VideoLayers,
      (progress) => {
        setRenderPercent((progress / 2) * 100);
      },
      selectedAspectRatio.width,
      selectedAspectRatio.height
    )
      .then(({ data, mergePoints }) => {
        const markerTime = layers[1].animationData.markers[0].tm * (1 / 30);
        const pointsToMerge = [];
        for (let i = 0; i < mergePoints.length - 1; i++) {
          if (mergePoints[i] > markerTime) {
            pointsToMerge.push(
              mergePoints[i] - TransitionLayers[i].markers[0].tm * (1 / 30)
            );
          }
        }

        convertLottieToPngSequenceAndBurn(
          TransitionLayers,
          data,
          (progress) => {
            setRenderPercent(50 + (progress / 2) * 100);
          },
          pointsToMerge,
          selectedAspectRatio.width,
          selectedAspectRatio.height
        )
          .then((blob) => {
            console.log(blob);
            downloadUint8ArrayAsMP4(blob, "download_with_audio.mp4");
          })
          .catch((error) => {
            console.log(error);
          });
      })
      .catch((error) => {
        console.log(error);
      });
  }, []);
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
