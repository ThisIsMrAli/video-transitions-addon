import React from 'react'
import ViewerBox from '../molecuels/ViewerBox';
import FileInput from '../molecuels/FileInput';

const Home = () => {
  return (
    <div className="w-full h-full flex flex-col items-center ">
      <ViewerBox />
      <FileInput />
    </div>
  );
};

export default Home