import React, { useRef } from "react";
import { MdOutlineClose } from "react-icons/md";
import { showTransitionSelectorOverlayAtom } from "../../../store/general";
import { useAtom } from "jotai";

import data from "./../../../assets/svgData.json";
import TransitionItem from "../molecuels/TransitionItem";
const TransitionSelectorOverlay = () => {
  const [isOpen, setIsOpen] = useAtom(showTransitionSelectorOverlayAtom);
  const dialogRef = useRef(null);
  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    isOpen && (
      <div
        ref={dialogRef}
        className="fixed flex flex-col items-center justify-center top-0 z-50 left-0 w-screen h-full bg-[rgba(0,0,0,0.7)] px-[25px]"
      >
        <div className="w-full rounded-[5px] bg-white flex flex-col py-[20px] items-center px-4 relative max-h-[calc(90vh-80px)]">
          <div
            tabIndex={0}
            className="absolute right-[12px] top-[12px] cursor-pointer"
            onClick={handleClose}
          >
            <MdOutlineClose size={20} />
          </div>
          <h3 className="text-[15px] font-bold ">Select Transition</h3>
          <div className="w-full overflow-auto flex-1">
            <div className="grid grid-cols-2 gap-4">
              {data[0].items.map((item) => {
                return (
                  <TransitionItem
                    onClose={handleClose}
                    key={item.id}
                    selected={false}
                    category={data[0].name}
                    template={item}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    )
  );
};

export default TransitionSelectorOverlay;
