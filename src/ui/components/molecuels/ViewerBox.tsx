import React, { useEffect, useRef, useState } from "react";
import { aspectRatioAtom, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";

const ViewerBox = () => {
  const [layers] = useAtom(layersAtom);
  const [aspectRatio] = useAtom(aspectRatioAtom);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const videoLayers = layers.filter((layer) => layer.assetType === "media");
      if (!containerRef.current || videoLayers.length === 0) return;

      // Clear existing videos if any
      videoRefs.current.forEach((video) => {
        video.pause();
        URL.revokeObjectURL(video.src);
        video.remove();
      });
      videoRefs.current = [];

      // Calculate total duration of all videos
      const getTotalDuration = () => {
        return videoLayers.reduce((total, layer) => {
          const duration =
            layer.end && layer.start
              ? layer.end - layer.start
              : videoRefs.current[videoLayers.indexOf(layer)]?.duration || 0;
          return total + duration;
        }, 0);
      };

      // Get current time across all videos
      const getCurrentTime = () => {
        let time = 0;
        for (let i = 0; i < currentVideoIndex; i++) {
          const layer = videoLayers[i];
          time +=
            layer.end && layer.start
              ? layer.end - layer.start
              : videoRefs.current[i]?.duration || 0;
        }
        time += videoRefs.current[currentVideoIndex]?.currentTime || 0;
        return time;
      };

      // Create video elements
      videoRefs.current = videoLayers.map((layer, index) => {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(layer.orgFile);
        video.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: ${index === currentVideoIndex ? 1 : 0};
        `;
        video.muted = true;
        video.playsInline = true;
        containerRef.current?.appendChild(video);
        return video;
      });

      // Timeline click handler
      const handleTimelineClick = (e: MouseEvent) => {
        if (!timelineRef.current || videoLayers.length === 0) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        const totalDuration = getTotalDuration();
        const targetTime = totalDuration * clickPosition;

        // Find which video this time corresponds to
        let accumulatedTime = 0;
        for (let i = 0; i < videoLayers.length; i++) {
          const layer = videoLayers[i];
          const videoDuration =
            layer.end && layer.start
              ? layer.end - layer.start
              : videoRefs.current[i].duration;

          if (accumulatedTime + videoDuration > targetTime) {
            // This is the video we want
            videoRefs.current[currentVideoIndex].style.opacity = "0";
            videoRefs.current[i].style.opacity = "1";
            videoRefs.current[i].currentTime = targetTime - accumulatedTime;
            setCurrentVideoIndex(i);
            break;
          }
          accumulatedTime += videoDuration;
        }
      };

      // Add timeline event listeners
      if (timelineRef.current) {
        timelineRef.current.addEventListener("mousedown", handleTimelineClick);
      }

      const checkProgress = () => {
        const currentVideo = videoRefs.current[currentVideoIndex];
        if (!currentVideo) return;

        const currentLayer = videoLayers[currentVideoIndex];
        const videoDuration =
          currentLayer.end && currentLayer.start
            ? currentLayer.end - currentLayer.start
            : currentVideo.duration;

        // Update progress bar
        const totalDuration = getTotalDuration();
        const currentTime = getCurrentTime();
        setProgress((currentTime / totalDuration) * 100);

        if (currentVideo.currentTime >= videoDuration) {
          currentVideo.style.opacity = "0";
          const nextIndex =
            currentVideoIndex === videoRefs.current.length - 1
              ? 0
              : currentVideoIndex + 1;
          const nextVideo = videoRefs.current[nextIndex];
          nextVideo.currentTime = 0;
          nextVideo.style.opacity = "1";
          nextVideo.play().catch((err) => console.log("Playback failed:", err));
          setCurrentVideoIndex(nextIndex);
        }
      };

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = window.setInterval(checkProgress, 50);

      // Start playing the current video
      const currentVideo = videoRefs.current[currentVideoIndex];
      if (currentVideo) {
        currentVideo
          .play()
          .catch((err) => console.log("Playback failed:", err));
      }

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        if (timelineRef.current) {
          timelineRef.current.removeEventListener(
            "mousedown",
            handleTimelineClick
          );
        }
        videoRefs.current.forEach((video) => {
          URL.revokeObjectURL(video.src);
          video.remove();
        });
      };
    })();
  }, [layers, currentVideoIndex]);

  return (
    <div className="relative w-full bg-black">
      <div
        className="relative w-full"
        style={{
          paddingTop: `${(aspectRatio.height / aspectRatio.width) * 100}%`,
        }}
      >
        <div ref={containerRef} className="absolute inset-0" />
      </div>

      <div className="relative h-8 px-4 bg-gray-900">
        <div
          ref={timelineRef}
          className="absolute inset-0 mx-4 my-3 bg-gray-700 rounded-full cursor-pointer"
        >
          <div
            ref={progressRef}
            className="absolute h-full bg-blue-500 rounded-full"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute right-0 w-4 h-4 -translate-y-1/4 translate-x-1/2 bg-white rounded-full shadow-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewerBox;
