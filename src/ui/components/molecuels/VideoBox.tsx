import { ToastQueue } from "@react-spectrum/toast";
import React, { useRef, useState, useEffect } from "react";
import { MdMoreHoriz } from "react-icons/md";
import { uuid } from "short-uuid";
import { layersAtom, aspectRatioAtom } from "../../../store/general";
import { useAtom } from "jotai";

const VideoBox = ({ item }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const trimStart = item.start;
  const trimEnd = item.end;
  const [isDragging, setIsDragging] = useState(null);
  const sliderRef = useRef(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextRef = useRef(null);
  const [layers, setLayers] = useAtom(layersAtom);
  const [aspectRatio] = useAtom(aspectRatioAtom);

  // Remove the baseSize and ratio calculations
  const dimensions =
    aspectRatio.name == "Vertical"
      ? {
          width: "99px",
          height: "176px",
        }
      : aspectRatio.name == "Horizontal"
      ? {
          width: "312px",
          height: "176px",
        }
      : { width: "176px", height: "176px" };

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
      const newLayers = layers.map((layer) => {
        if (layer.id === item.id) {
          return {
            ...layer,
            start: Math.min(newTime, trimEnd),
            changedTrims: true,
          };
        }
        return layer;
      });
      setLayers(newLayers);

      if (videoRef.current) videoRef.current.currentTime = newTime;
    } else {
      //  setTrimEnd(Math.max(newTime, trimStart));
      const newLayers = layers.map((layer) => {
        if (layer.id === item.id) {
          return {
            ...layer,
            end: Math.max(newTime, trimStart),
            changedTrims: true,
          };
        }
        return layer;
      });
      setLayers(newLayers);
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
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 100);

    let timeString = "";
    if (hours > 0) {
      timeString = `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    } else {
      timeString = `${minutes.toString().padStart(2, "0")}:${seconds
        .toString()
        .padStart(2, "0")}`;
    }

    return `${timeString}.${milliseconds.toString().padStart(2, "0")}`;
  };
  const handleMoreClick = (e, selected) => {
    e.stopPropagation();
    setShowContextMenu(selected);
  };

  const handleReplaceVideo = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".mp4,.webm";
    input.max = "209715200"; // 200MB in bytes

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (file.size <= 200 * 1024 * 1024) {
          const url = URL.createObjectURL(file);
          const video = document.createElement("video");
          video.src = url;
          video.onloadedmetadata = () => {
            const newLayers = layers.map((layer) => {
              if (layer.id === item.id) {
                return {
                  id: uuid(),
                  assetType: "media",
                  file: url,
                  orgFile: file,
                  type: file.type,
                  name: file.name,
                  changedTrims: false,
                  start: 0,
                  end: video.duration,
                };
              }
              return layer;
            });
            setLayers(newLayers);
          };
        } else {
          ToastQueue.negative("File size exceeds 200MB limit", {
            timeout: 3000,
          });
        }
      }
    };

    input.click();
  };

  const handeVideoTrimChange = () => {};
  return (
    <div
      className="relative group bg-[#f8f8f8] overflow-hidden outline outline-2 outline-[#EBEBEB] rounded-[8px]"
      style={dimensions}
    >
      {true && (
        <div
          ref={contextRef}
          className="items-end space-y-1 right-1 top-1 hidden  group-hover:flex flex-col absolute z-50"
        >
          <div className="items-center justify-center h-[14px] flex overflow-hidden bg-white rounded-[4px]">
            <MdMoreHoriz
              onClick={(e) => handleMoreClick(e, !showContextMenu)}
              color="black"
              size={19}
            />
          </div>

          <ul
            className={`${
              showContextMenu ? "flex" : "hidden"
            } rounded-[4px] bg-white flex-col z-50  text-[11px]`}
          >
            <li
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleReplaceVideo();
              }}
              tabIndex={0}
              className="text-[#484848] hover:text-black flex items-center w-full p-1"
            >
              Replace Video
            </li>
          </ul>
        </div>
      )}
      <video
        ref={videoRef}
        muted={true}
        className="w-full h-full object-contain"
        onTimeUpdate={handleTimeUpdate}
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
            <div className="absolute w-full h-1 bg-white/20 top-1/2 -translate-y-1/2" />

            <div
              className="absolute h-1 bg-white/90 top-1/2 -translate-y-1/2"
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
                shadow-lg hover:h-6 hover:w-3 transition-all duration-150
                ${
                  isDragging === "start" ? "h-7 w-4 ring-2 ring-white/30" : ""
                }`}
              style={{ left: getLeftPosition() }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 px-1 py-0.5 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100">
                {formatTime(trimStart)}
              </div>
            </div>

            <div
              onMouseDown={(e) => handleMouseDown(e, "end")}
              className={`absolute w-2 h-4 bg-white/90 rounded-sm -mr-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize 
                shadow-lg hover:h-6 hover:w-3 transition-all duration-150
                ${isDragging === "end" ? "h-7 w-4 ring-2 ring-white/30" : ""}`}
              style={{ left: getRightPosition() }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/90 px-1 py-0.5 rounded text-[10px] text-white font-mono whitespace-nowrap opacity-0 group-hover:opacity-100">
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
