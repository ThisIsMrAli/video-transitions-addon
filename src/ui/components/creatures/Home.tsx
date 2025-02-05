import React, { useState } from "react";
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
import {
  ActionButton,
  Button,
  Tooltip,
  TooltipTrigger,
} from "@adobe/react-spectrum";
import { useNavigate } from "react-router-dom";
import BackIcon from "@spectrum-icons/workflow/ChevronLeft";

const Home = () => {
  const navigate = useNavigate();
  const [layers, setLayers] = useAtom(layersAtom);
  const [tooltipIsOpen, setTooltipIsOpen] = useState(false);

  return (
    <div className="w-full h-full flex flex-col items-center space-y-4 relative">
      <span className="text-black font-[900] flex w-full text-left justify-start items-center text-[18px]  ml-[12px]">
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
      <div className="text-center mb-4 px-2 !mt-0">
        <p className="text-sm text-gray-700 mt-1">
          Create stunning video transitions and combine multiple clips with
          professional effects.
        </p>
      </div>
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

      <TooltipTrigger
        placement="top"
        delay={0}
        isOpen={tooltipIsOpen && layers.length <= 2}
      >
        <div
          className="inline-block"
          onMouseEnter={() => setTooltipIsOpen(true)}
          onMouseLeave={() => setTooltipIsOpen(false)}
        >
          <Button
            UNSAFE_className="!mb-2 !mt-2"
            variant="accent"
            height="size-400"
            isDisabled={layers.length <= 2}
            width={`single-line-width`}
            onPress={() => navigate("/render")}
          >
            Render
          </Button>
        </div>
        <Tooltip>
          <span>Select at least 2 video layers and 1 transition layer</span>
        </Tooltip>
      </TooltipTrigger>
    </div>
  );
};

export default Home;
