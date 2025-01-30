import { Button } from "@adobe/react-spectrum";
import React from "react";
import { aspectRatioAtom, aspectRatios, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import { useNavigate } from "react-router-dom";

const AspectRationSelect = () => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useAtom(aspectRatioAtom);
  const navigate = useNavigate();
  const [layers, setLayers] = useAtom(layersAtom);
  const handleContinue = () => {
    setLayers([]);
    navigate("/home");
  };
  return (
    <div className="h-full w-full flex items-center justify-center flex-col p-4 gap-6">
      <h3 className="text-base font-bold">Select Aspect Ratio</h3>
      <div className="flex items-center justify-center flex-col bg-expressbgLighter gap-4 py-6 rounded-[20px] w-full">
        <span className="text-xs text-expressText">
          Select the output video aspect ratio and continue
        </span>
        <div className="flex items-end justify-center gap-4 mt-4">
          {aspectRatios.map((aspectRatio, index) => (
            <button onClick={()=>setSelectedAspectRatio(aspectRatio)} key={index} className="aspect-ratio-btn group">
              <div
                style={{
                  width: `${aspectRatio.width / 18}px`,
                  height: `${aspectRatio.height / 18}px`,
                  borderColor:
                    selectedAspectRatio.name === aspectRatio.name
                      ? "#2563eb"
                      : "#d5d5d5",
                }}
                className={`rounded-[6px] mb-2 border-2  flex items-center justify-center group-hover:!border-blue-600 transition-all duration-300`}
              >
                <span
                  style={{
                    color:
                      selectedAspectRatio.name === aspectRatio.name
                        ? "#222222"
                        : "#808080",
                  }}
                  className="text-xxs text-expressbgDarker transition-all duration-300 group-hover:!text-expressText"
                >
                  {aspectRatio.name}
                </span>
              </div>
              <span style={{
                color:
                  selectedAspectRatio.name === aspectRatio.name
                    ? "#222222"
                    : "#808080",
              }} className="text-sm transition-all duration-300 group-hover:!text-expressText">{aspectRatio.value}</span>
            </button>
          ))}
        </div>
      </div>
      <Button variant="accent" UNSAFE_className="w-full" onPress={handleContinue}>
        Continue
      </Button>
    </div>
  );
};

export default AspectRationSelect;
