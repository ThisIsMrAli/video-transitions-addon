import React from "react";
import ViewerBox from "../molecuels/ViewerBox";
import FileInput from "../molecuels/FileInput";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import VideoBox from "../molecuels/VideoBox";
import TransitionInput from "../molecuels/TransitionInput";

const Home = () => {
  const [layers] = useAtom(layersAtom);
  return (
    <div className="w-full h-full flex flex-col items-center ">
      <ViewerBox />
      {layers.map((layer, index) => (
        <VideoBox key={index} item={layer} />
      ))}
      {layers.length > 0 && layers[layers.length - 1].assetType == "media" ? (
        <TransitionInput />
      ) : (
        <FileInput />
      )}
    </div>
  );
};

export default Home;
