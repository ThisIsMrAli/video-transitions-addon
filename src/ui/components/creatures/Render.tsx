import React, { useEffect, useRef } from "react";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import { convertLottieToPngSequence, mergeVideos } from "../../../helpers/renderHelper";
import { downloadUint8ArrayAsMP4 } from "../../../helpers/utils";

const Render = () => {
  const [layers, setLayers] = useAtom(layersAtom);
  const svgRef = useRef(null);

  useEffect(() => {
    console.log(layers);
    convertLottieToPngSequence(layers[1].animationData, (progress) => {
      console.log(progress);
    }, svgRef);
    // mergeVideos(layers[0].orgFile, layers[2].orgFile, (progress) => {
    //   console.log(progress);
    // })
    //   .then((blob) => {
    //     console.log(blob);
    //     downloadUint8ArrayAsMP4(blob, "download_with_audio.mp4");
    //   })
    //   .catch((error) => {
    //     console.log(error);
    //   });
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
