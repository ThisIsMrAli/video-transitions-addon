import React, { useEffect, useRef, useState } from "react";
import { layersAtom } from "../../../store/general";
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
  useEffect(() => {
    console.log(renderPercent);
  }, [renderPercent]);

  useEffect(() => {
    console.log(layers);
    console.log(layers[0].end, layers[0].end.toFixed(3));
    mergeVideos(layers.filter((layer) => layer.assetType === "media").map((layer) => layer.orgFile), (progress) => {
      setRenderPercent((progress / 2) * 100);
    })
      .then(({ data, mergePoints }) => {
        console.log("mergePoint", mergePoints);
        const markerTime = layers[1].animationData.markers[0].tm * (1 / 30);
        convertLottieToPngSequenceAndBurn(
          layers[1].animationData,
          data,
          (progress) => {
            setRenderPercent(50 + (progress / 2) * 100);
          },
          svgRef,
          mergePoints[0] - markerTime
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
