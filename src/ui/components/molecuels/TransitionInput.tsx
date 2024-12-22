import { useAtom } from "jotai";
import React, { useRef, useState, DragEvent } from "react";
import { layersAtom } from "../../../store/general";
import { convertFileToBase64 } from "../../../helpers/utils";
import { ToastQueue } from "@react-spectrum/toast";
// Import the upload icon

const TransitionInput = () => {
  const [layers, setLayers] = useAtom(layersAtom);

  return (
    <div
      className={`cursor-pointer bg-[#f8f8f8] overflow-hidden flex flex-col justify-center items-center w-[150px] h-[150px] group rounded-[8px] outline outline-2 outline-[#EBEBEB] 
      `}
    >
    
      <img
        src={"./icons/transition.svg"}
        alt="Upload"
        className="w-[25px] mt-[-10px] mb-[10px]"
      />
      <span
        className={`chooseImage text-[14px] text-[#242424] group-hover:text-borderHover font-bold`}
      >
       Select Transition
      </span>
    </div>
  );
};

export default TransitionInput;
