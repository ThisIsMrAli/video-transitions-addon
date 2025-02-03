import React from "react";
import ViewerBox from "../molecuels/ViewerBox";
import FileInput from "../molecuels/FileInput";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import VideoBox from "../molecuels/VideoBox";
import TransitionInput from "../molecuels/TransitionInput";
import TransitionSelectorOverlay from "../organism/TransitionSelectorOverlay";
import TransitionItem from "../molecuels/TransitionItem";
import TransitionBox from "../molecuels/TransitionBox";
import { cloneDeep } from "lodash";
import { ActionButton, Button } from "@adobe/react-spectrum";
import { useNavigate } from "react-router-dom";
import BackIcon from "@spectrum-icons/workflow/ChevronLeft";

const Home = () => {
  const navigate = useNavigate();
  const [layers, setLayers] = useAtom(layersAtom);
  
  
  return (
    <div className="w-full h-full flex flex-col items-center space-y-4 relative">
      <span className="text-black font-[900] flex w-full text-left justify-start items-center text-[18px] mb-2 ml-[12px]">
        <ActionButton
          onPress={() => navigate("/")}
          isQuiet
          aria-label="Icon only"
          UNSAFE_className="mr-[2px] cursor-pointer"
        >
          <BackIcon />
        </ActionButton>
        Stage
      </span>
      <TransitionSelectorOverlay />
      <ViewerBox />
      <div className="flex-1 w-full overflow-auto">
        <div className="flex flex-col space-y-4 p-4 items-center w-full">
          {layers.map((layer, index) =>
            layer.assetType == "media" ? (
              <VideoBox key={layer.id} item={layer} />
            ) : (
              <TransitionBox
                key={layer.id}
                item={layer}
                setItem={(item) => {
                  const newLayers = cloneDeep(layers);
                  newLayers[index] = item;
                  setLayers(newLayers);
                }}
              />
            )
          )}

          {layers.length > 0 &&
          layers[layers.length - 1].assetType == "media" ? (
            <TransitionInput />
          ) : (
            <FileInput />
          )}
        </div>
      </div>
      <Button
        UNSAFE_className="!mb-2 !mt-2"
        variant="accent"
        height="size-400"
        isDisabled={layers.length == 0}
        width={`single-line-width`}
        onPress={() => navigate("/render")}
      >
        Render
      </Button>
    </div>
  );
};

export default Home;
