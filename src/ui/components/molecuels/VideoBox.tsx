import React, { useRef, useState, useEffect } from "react";

const VideoBox = ({ item }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(null);
  const sliderRef = useRef(null);

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = trimStart;
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.currentTime >= trimEnd) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setTrimEnd(videoRef.current.duration);
    }
  };

  const calculatePosition = (clientX) => {
    if (!videoRef.current || !sliderRef.current) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const position = (clientX - rect.left) / rect.width;
    const time = position * videoRef.current.duration;
    return Math.max(0, Math.min(time, videoRef.current.duration));
  };

  const handleMouseDown = (e, handle) => {
    setIsDragging(handle);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const newTime = calculatePosition(e.clientX);
    if (isDragging === "start") {
      setTrimStart(Math.min(newTime, trimEnd));
      if (videoRef.current) videoRef.current.currentTime = newTime;
    } else {
      setTrimEnd(Math.max(newTime, trimStart));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const getLeftPosition = () => {
    if (!videoRef.current) return "0%";
    return `${(trimStart / videoRef.current.duration) * 100}%`;
  };

  const getRightPosition = () => {
    if (!videoRef.current) return "100%";
    return `${(trimEnd / videoRef.current.duration) * 100}%`;
  };

  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${milliseconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="relative group w-[150px] h-[150px] bg-[#f8f8f8] overflow-hidden outline outline-2 outline-[#EBEBEB] rounded-[8px]">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      >
        <source src={item.file} type={item.type} />
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={handlePlay}
          className="p-2 rounded-full bg-white/30 hover:bg-white/60 transition-colors"
        >
          {isPlaying ? (
            <svg
              className="w-5 h-5 text-black/60 group-hover:text-black/80"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-black/60 group-hover:text-black/80"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="space-y-4">
          <div ref={sliderRef} className="relative h-8">
            <div className="absolute w-full h-1 bg-white/20 rounded-full top-1/2 -translate-y-1/2" />

            <div
              className="absolute h-1 bg-white/90 rounded-full top-1/2 -translate-y-1/2"
              style={{
                left: getLeftPosition(),
                right: `${
                  100 - (trimEnd / (videoRef.current?.duration || 1)) * 100
                }%`,
              }}
            />

            <div
              onMouseDown={(e) => handleMouseDown(e, "start")}
              className={`absolute w-2 h-4 bg-white/90 rounded-sm -ml-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize 
                shadow-lg hover:h-7 hover:w-4 transition-all duration-150
                ${
                  isDragging === "start" ? "h-7 w-4 ring-2 ring-white/30" : ""
                }`}
              style={{ left: getLeftPosition() }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100">
                {formatTime(trimStart)}
              </div>
            </div>

            <div
              onMouseDown={(e) => handleMouseDown(e, "end")}
              className={`absolute w-2 h-4 bg-white/90 rounded-sm -mr-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize 
                shadow-lg hover:h-7 hover:w-4 transition-all duration-150
                ${isDragging === "end" ? "h-7 w-4 ring-2 ring-white/30" : ""}`}
              style={{ left: getRightPosition() }}
            >
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100">
                {formatTime(trimEnd)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoBox;
