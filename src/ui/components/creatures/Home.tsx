import React from 'react'
import ViewerBox from '../molecuels/ViewerBox';
import FileInput from '../molecuels/FileInput';
import { layersAtom } from '../../../store/general';
import { useAtom } from 'jotai';
import VideoBox from '../molecuels/VideoBox';

const Home = () => {
  const [layers] = useAtom(layersAtom);
  return (
    <div className="w-full h-full flex flex-col items-center ">
      <ViewerBox />
      <FileInput />
      {
        layers.map((layer, index) => (
          <VideoBox key={index} item={layer} />
        ))
      }
    </div>
  );
};

export default Home