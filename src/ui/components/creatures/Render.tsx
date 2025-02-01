import React, { useEffect, useRef, useState } from "react";
import { aspectRatioAtom, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import {
  convertLottieToPngSequenceAndBurn,
  mergeVideos,
} from "../../../helpers/renderHelper";
import { downloadUint8ArrayAsMP4 } from "../../../helpers/utils";

const Render = () => {
  const [layers, setLayers] = useAtom(layersAtom);
  const svgRef = useRef(null);
  const [renderPercent, setRenderPercent] = useState(0);
  const [selectedAspectRatio, setSelectedAspectRatio] =
    useAtom(aspectRatioAtom);
  useEffect(() => {
    console.log(renderPercent);
  }, [renderPercent]);

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
          svgRef,
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
    <div>
      <div
        className="w-[130px] z-0 overflow-hidden rounded-[4px]"
        ref={svgRef}
      ></div>
    </div>
  );
};

export default Render;
