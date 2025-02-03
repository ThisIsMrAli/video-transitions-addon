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
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const activeVideoIndexRef = useRef(0);

  useEffect(() => {
    const videoLayers = layers.filter((layer) => layer.assetType === "media");
    if (!containerRef.current || videoLayers.length === 0) return;

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

    // Update getCurrentTime to use activeVideoIndexRef
    const getCurrentTime = () => {
      let time = 0;
      for (let i = 0; i < activeVideoIndexRef.current; i++) {
        const layer = videoLayers[i];
        time +=
          layer.end && layer.start
            ? layer.end - layer.start
            : videoRefs.current[i]?.duration || 0;
      }
      time += videoRefs.current[activeVideoIndexRef.current]?.currentTime || 0;
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
        opacity: ${index === activeVideoIndexRef.current ? 1 : 0};
      `;
      video.muted = true;
      video.playsInline = true;
      containerRef.current?.appendChild(video);
      return video;
    });

    // Timeline click handler
    const handleTimelineClick = async (e: MouseEvent) => {
      if (!timelineRef.current || videoLayers.length === 0) return;

      isSeekingRef.current = true;

      // Pause all videos during seeking
      videoRefs.current.forEach((video) => {
        video.pause();
        video.style.opacity = "0";
      });

      const rect = timelineRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const totalDuration = getTotalDuration();
      const targetTime = totalDuration * clickPosition;

      // Find which video this time corresponds to
      let accumulatedTime = 0;
      let targetIndex = 0;
      let videoTargetTime = 0;

      for (let i = 0; i < videoLayers.length; i++) {
        const layer = videoLayers[i];
        const videoDuration =
          layer.end && layer.start
            ? layer.end - layer.start
            : videoRefs.current[i].duration;

        if (accumulatedTime + videoDuration > targetTime) {
          targetIndex = i;
          videoTargetTime = targetTime - accumulatedTime;
          break;
        }
        accumulatedTime += videoDuration;
      }

      const targetVideo = videoRefs.current[targetIndex];
      
      // Set the time and wait for it to be ready
      targetVideo.currentTime = videoTargetTime;
      
      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          targetVideo.removeEventListener('seeked', handleSeeked);
          resolve();
        };
        targetVideo.addEventListener('seeked', handleSeeked);
      });

      // Update the UI and play the video
      targetVideo.style.opacity = "1";
      activeVideoIndexRef.current = targetIndex;
      
      try {
        await targetVideo.play();
      } catch (err) {
        console.log("Playback failed:", err);
      }

      isSeekingRef.current = false;
    };

    // Add timeline event listeners
    if (timelineRef.current) {
      timelineRef.current.addEventListener("mousedown", handleTimelineClick);
    }

    const checkProgress = () => {
      if (isSeekingRef.current) return;

      const currentVideo = videoRefs.current[activeVideoIndexRef.current];
      if (!currentVideo) return;

      const currentLayer = videoLayers[activeVideoIndexRef.current];
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
          activeVideoIndexRef.current === videoRefs.current.length - 1
            ? 0
            : activeVideoIndexRef.current + 1;
        const nextVideo = videoRefs.current[nextIndex];
        nextVideo.currentTime = 0;
        nextVideo.style.opacity = "1";
        nextVideo.play().catch((err) => console.log("Playback failed:", err));
        activeVideoIndexRef.current = nextIndex;
      }
    };

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(checkProgress, 50);

    // Only start playing if not seeking
    if (!isSeekingRef.current) {
      const currentVideo = videoRefs.current[activeVideoIndexRef.current];
      if (currentVideo) {
        currentVideo
          .play()
          .catch((err) => console.log("Playback failed:", err));
      }
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
  }, [layers]);

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
