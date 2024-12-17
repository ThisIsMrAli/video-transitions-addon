import React, { useEffect } from "react";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";

const ViewerBox = () => {
  const [layers] = useAtom(layersAtom);
  useEffect(() => {
    console.log(layers);
  }, [layers]);
  return (
    <div className="w-[280px] h-[158px] bg-[#FBFBFB] border border-solid border-[#EBEBEB]  rounded-[8px] flex flex-col items-center justify-center overflow-hidden">
      <h3 className="text-[#c1c1c1] text-center text-[30px] font-[400] m-0 p-0 leading-[36px]">
        viewer <br /> box
      </h3>
    </div>
  );
};

export default ViewerBox;
