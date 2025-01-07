import React, { useEffect, useRef, useState } from "react";
import LottieLight from "react-lottie-player/dist/LottiePlayerLight.modern";
import { useHover } from "@uidotdev/usehooks";
import Skeleton from "react-loading-skeleton";
import { uuid } from "short-uuid";
import {
  layersAtom,
  showTransitionSelectorOverlayAtom,
} from "../../../store/general";
import { useAtom } from "jotai";
import { MdMoreHoriz } from "react-icons/md";
import LottieWebParser from "./../../../lottie-web-parser";
import { cloneDeep, isEqual } from "lodash";
import ColorInput from "../atoms/ColorInput";
import Lottie from "react-lottie-player";
const TransitionBox = ({ item, setItem }) => {
  const [colors, setColors] = useState([]);
  const selectedItemAnimationData = item.animationData;
  const [ref, hovering] = useHover();
  const [layers, setLayers] = useAtom(layersAtom);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextRef = useRef(null);
  const width = 100;
  const height = item.item.ratio == "h" ? 55 : item.item.ratio == "s" ? 100 : 175;
  const [isOpen, setIsOpen] = useAtom(showTransitionSelectorOverlayAtom);
  const prevSelectedItemAnimationData = useRef();
  useEffect(() => {
    if (
      selectedItemAnimationData &&
      Object.keys(selectedItemAnimationData).length > 0
    ) {
      //@ts-ignore
      if (
        prevSelectedItemAnimationData.current &&
        //@ts-ignore
        prevSelectedItemAnimationData.current.nm ==
          selectedItemAnimationData.nm &&
        //@ts-ignore
        prevSelectedItemAnimationData.current.layers.length ==
          selectedItemAnimationData.layers.length &&
        //@ts-ignore
        prevSelectedItemAnimationData.current.op == selectedItemAnimationData.op
      )
        return;

      const rawDataColors = LottieWebParser.parseColors(
        selectedItemAnimationData
      );

      const colors = [];


      rawDataColors.forEach((element) => {
        element.shapes.forEach((sh) => {
          // if(sh.isMask){return}
          let c = colors.find((cc) => isEqual(cc.rgba, sh.rgba));
          if (c) {
            c.paths = [...c.paths, sh.path];
          } else {
            c = { rgba: sh.rgba, paths: [sh.path] };
            colors.push(c);
          }
        });
      });


      setColors([...colors]);
      prevSelectedItemAnimationData.current = selectedItemAnimationData;
    }
  }, [selectedItemAnimationData]);
  const handleMoreClick = (e, selected) => {
    e.stopPropagation();
    setShowContextMenu(selected);
  };
  const handleReplaceTransition = () => {
    setIsOpen({
      open: true,
      index: layers.findIndex((layer) => layer.id === item.id),
    });
  };

  const onColorChange = (rgba, index) => {
    const newAnimationData = cloneDeep(selectedItemAnimationData);
    const newColors = cloneDeep(colors);
    newColors[index].rgba = rgba;
    setColors(newColors);
    for (let i = 0; i < newColors[index].paths.length; i++) {
      LottieWebParser.replaceColor(
        rgba,
        newColors[index].paths[i],
        newAnimationData
      );
    }
    setItem({ ...item, animationData: newAnimationData });
  };
  return (
    <div
      ref={ref}
      className={`group  rounded-lg overflow-hidden flex flex-col items-center justify-center text-3xl relative`}
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
      <div
        style={{ backgroundColor: "black", height: height }}
        className="w-[100px] border-2 hover:border-blue-500 rounded-lg overflow-hidden flex flex-col items-center justify-center"
      >
        {item.animationData && Object.keys(item.animationData).length > 0 ? (
          <>
            {false ? (
              <img />
            ) : (
              <Lottie
                loop
                play={hovering || true}
                style={{ width: "100%" }}
                animationData={item.animationData}
              />
            )}
          </>
        ) : (
          <Skeleton width={width} height={height + 5} />
        )}
      </div>
      <div className="flex space-x-[2px] self-start">
        {colors.map((c, index) => (
          <ColorInput
            key={c.paths.toString()}
            rgba={c.rgba}
            onChange={(newColor) => onColorChange(newColor, index)}
          />
        ))}
      </div>

    </div>
  );
};

export default TransitionBox;
