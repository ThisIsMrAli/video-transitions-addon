import React, { useRef } from "react";
import { hexToRGBA, rgbaToHex } from "../../../helpers/utils";

const ColorInput = ({ rgba, onChange }) => {
  const color = rgbaToHex(rgba);
  const ref = useRef(null);
  return (
    <div
      style={{ backgroundColor: color }}
      className="w-[22px] h-[22px] cursor-pointer  rounded-full border border-solid border-[#dadada] relative"
      onClick={() => ref.current.click()}
    >
      <input
        ref={ref}
        type="color"
        value={color}

        onChange={(e) => onChange(hexToRGBA(e.target.value, 1))}
        className="w-1 h-1 border-none opacity-0 absolute bottom-0 left-0"
      />
    </div>
  );
};

export default ColorInput;
