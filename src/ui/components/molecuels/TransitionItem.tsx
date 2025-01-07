import React, { useEffect, useState } from "react";
import LottieLight from "react-lottie-player/dist/LottiePlayerLight.modern";
import { useHover } from "@uidotdev/usehooks";
import Skeleton from "react-loading-skeleton";
import { uuid } from "short-uuid";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import Lottie from "react-lottie-player";
const TransitionItem = ({ selected, category, template, onClose, onClick }) => {
  const [ref, hovering] = useHover();
  const [animationData, setAnimationData] = useState(null);


  const width = 100;
  const height = template.ratio == "h" ? 55 : template.ratio == "s" ? 100 : 175;
  useEffect(() => {
    setTimeout(() => {
      fetch(
        "./assets/" +
          "general" +
          "/" +
          category +
          "/" +
          template.name +
          ".json",
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      )
        .then(function (response) {
          return response.json();
        })
        .then(function (myJson) {
          setAnimationData(myJson);
        });
    }, 1);
  }, []);
  const handleClick = () => {
    // setLayers([
    //   ...layers,
    //   {
    //     id: uuid(),
    //     assetType: "transition",
    //     animationData: animationData,
    //   },
    // ]);
    onClick({
      id: uuid(),
      assetType: "transition",
      animationData: animationData,
      item: template,
    });
    onClose();
  };

  return (
    <div
      ref={ref}
      onClick={handleClick}
      style={{ backgroundColor: "black", height: height }}
      className={`w-[100px] border-2 ${
        selected && "border-blue-500"
      } hover:border-blue-500 rounded-lg overflow-hidden flex items-center justify-center text-3xl relative`}
    >
      {animationData && Object.keys(animationData).length > 0 ? (
        <>
          {false ? (
            <img />
          ) : (
            <Lottie
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

export default TransitionItem;
