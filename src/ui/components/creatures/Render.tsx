import React, { useEffect } from 'react'
import { layersAtom } from '../../../store/general';
import { useAtom } from 'jotai';
import { mergeVideos } from '../../../helpers/renderHelper';
import { downloadUint8ArrayAsMP4 } from '../../../helpers/utils';

const Render = () => {
  const [layers, setLayers] = useAtom(layersAtom);
  useEffect(() => {
    console.log(layers);
    mergeVideos(layers[0].orgFile, layers[2].orgFile, (progress) => {
      console.log(progress);
    }).then((blob) => {
      console.log(blob);
       downloadUint8ArrayAsMP4(blob, "download_with_audio.mp4");
    }).catch((error) => {
      console.log(error);
    });
  }, []);
  return <div>Render</div>;
};

export default Render