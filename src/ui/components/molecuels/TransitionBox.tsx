import React, { useEffect, useRef, useState } from "react";
import LottieLight from "react-lottie-player/dist/LottiePlayerLight.modern";
import { useHover } from "@uidotdev/usehooks";
import Skeleton from "react-loading-skeleton";
import { uuid } from "short-uuid";
import { layersAtom, showTransitionSelectorOverlayAtom } from "../../../store/general";
import { useAtom } from "jotai";
import { MdMoreHoriz } from "react-icons/md";
const TransitionBox = ({ animationData, item }) => {
  const [ref, hovering] = useHover();
  const [layers, setLayers] = useAtom(layersAtom);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextRef = useRef(null);
  const width = 100;
  const height = 100;
  const [isOpen, setIsOpen] = useAtom(showTransitionSelectorOverlayAtom);
  const handleMoreClick = (e, selected) => {
    e.stopPropagation();
    setShowContextMenu(selected);
  };
  const handleReplaceTransition = () => {
    setIsOpen({ open: true, index: layers.findIndex((layer) => layer.id === item.id) });
  };


  return (
    <div
      ref={ref}
     
      style={{ backgroundColor: "black", height: height }}
      className={`w-[100px] border-2 group  hover:border-blue-500 rounded-lg overflow-hidden flex items-center justify-center text-3xl relative`}
    >
        {true && (
        <div
          ref={contextRef}
          className="items-end space-y-1 right-1 top-1 hidden  group-hover:flex flex-col absolute z-50"
        >
          <div className="items-center justify-center h-[14px] flex overflow-hidden bg-white rounded-[4px]">
            <MdMoreHoriz
              onClick={(e) => handleMoreClick(e, !showContextMenu)}
              color="black"
              size={19}
            />
          </div>

          <ul
            className={`${
              showContextMenu ? "flex" : "hidden"
            } rounded-[4px] bg-white flex-col z-50  text-[11px]`}
          >
            <li
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReplaceTransition();
              }}
              tabIndex={0}
              className="text-[#484848] hover:text-black flex items-center w-full p-1"
            >
              Replace Transition
            </li>
          </ul>
        </div>
      )}
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
