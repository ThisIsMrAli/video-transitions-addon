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

const Home = () => {
  const [layers] = useAtom(layersAtom);
  return (
    <div className="w-full h-full flex flex-col items-center space-y-4 ">
      <TransitionSelectorOverlay />
      <ViewerBox />
      {layers.map((layer, index) =>
        layer.assetType == "media" ? (
          <VideoBox key={layer.id} item={layer} />
        ) : (
          <TransitionBox
            key={layer.id}
            item={layer}
            animationData={layer.animationData}
          />
        )
      )}
      {layers.length > 0 && layers[layers.length - 1].assetType == "media" ? (
        <TransitionInput />
      ) : (
        <FileInput />
      )}
    </div>
  );
};

export default Home;
