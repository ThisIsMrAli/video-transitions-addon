import React, { useEffect, useState } from "react";
import LottieLight from "react-lottie-player/dist/LottiePlayerLight.modern";
import { useHover } from "@uidotdev/usehooks";
import Skeleton from "react-loading-skeleton";
import { uuid } from "short-uuid";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
const TransitionBox = ({ animationData }) => {
  const [ref, hovering] = useHover();
  const [layers, setLayers] = useAtom(layersAtom);

  const width = 100;
  const height = 100;



  return (
    <div
      ref={ref}
     
      style={{ backgroundColor: "black", height: height }}
      className={`w-[100px] border-2  hover:border-blue-500 rounded-lg overflow-hidden flex items-center justify-center text-3xl relative`}
    >
      {animationData && Object.keys(animationData).length > 0 ? (
        <>
          {false ? (
            <img />
          ) : (
            <LottieLight
              loop
              play={hovering || true}
              style={{ width: "100%" }}
              animationData={animationData}
            />
          )}
        </>
      ) : (
        <Skeleton width={width} height={height + 5} />
      )}
    </div>
  );
};

export default TransitionBox;
