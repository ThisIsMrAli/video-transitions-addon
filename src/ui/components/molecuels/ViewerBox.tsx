import React, { useEffect, useRef, useState } from "react";
import { aspectRatioAtom, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";

const ViewerBox = () => {
  const [layers] = useAtom(layersAtom);
  const [aspectRatio] = useAtom(aspectRatioAtom);
  const [progress, setProgress] = useState(0);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<HTMLVideoElement[]>([]);
  const timerRef = useRef<number | null>(null);
  const isSeekingRef = useRef(false);
  const activeVideoIndexRef = useRef(0);

  useEffect(() => {
    const videoLayers = layers.filter((layer) => layer.assetType === "media");
    if (!containerRef.current || videoLayers.length === 0) return;

    // Utility functions
    const getVideoDuration = (index: number) => {
      const layer = videoLayers[index];
      return layer.end && layer.start
        ? layer.end - layer.start
        : videoRefs.current[index]?.duration || 0;
    };

    const getTotalDuration = () => {
      return videoLayers.reduce(
        (total, _, index) => total + getVideoDuration(index),
        0
      );
    };

    const getCurrentTime = () => {
      const activeIndex = activeVideoIndexRef.current;
      const previousDuration = videoLayers
        .slice(0, activeIndex)
        .reduce((total, _, index) => total + getVideoDuration(index), 0);

      return (
        previousDuration + (videoRefs.current[activeIndex]?.currentTime || 0)
      );
    };

    // Video creation and setup
    const createVideoElement = (
      layer: (typeof videoLayers)[0],
      index: number
    ) => {
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
    };

    const setupVideos = () => {
      videoRefs.current = videoLayers.map(createVideoElement);
    };

    // Video playback control
    const playVideo = async (video: HTMLVideoElement) => {
      try {
        await video.play();
      } catch (err) {
        console.log("Playback failed:", err);
      }
    };

    const switchToVideo = async (index: number, startTime = 0) => {
      videoRefs.current.forEach((v) => {
        v.pause();
        v.style.opacity = "0";
      });

      const targetVideo = videoRefs.current[index];
      targetVideo.currentTime = startTime;

      await new Promise<void>((resolve) => {
        const handleSeeked = () => {
          targetVideo.removeEventListener("seeked", handleSeeked);
          resolve();
        };
        targetVideo.addEventListener("seeked", handleSeeked);
      });

      targetVideo.style.opacity = "1";
      activeVideoIndexRef.current = index;
      await playVideo(targetVideo);
    };

    // Timeline handling
    const handleTimelineClick = async (e: MouseEvent) => {
      if (!timelineRef.current || videoLayers.length === 0) return;
      isSeekingRef.current = true;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const targetTime = getTotalDuration() * clickPosition;

      // Find target video and time
      let accumulatedTime = 0;
      for (let i = 0; i < videoLayers.length; i++) {
        const videoDuration = getVideoDuration(i);
        if (accumulatedTime + videoDuration > targetTime) {
          await switchToVideo(i, targetTime - accumulatedTime);
          break;
        }
        accumulatedTime += videoDuration;
      }

      isSeekingRef.current = false;
    };

    // Progress tracking
    const checkProgress = () => {
      if (isSeekingRef.current) return;

      const currentVideo = videoRefs.current[activeVideoIndexRef.current];
      if (!currentVideo) return;

      const videoDuration = getVideoDuration(activeVideoIndexRef.current);
      setProgress((getCurrentTime() / getTotalDuration()) * 100);

      if (currentVideo.currentTime >= videoDuration) {
        const nextIndex =
          activeVideoIndexRef.current === videoRefs.current.length - 1
            ? 0
            : activeVideoIndexRef.current + 1;
        switchToVideo(nextIndex, 0);
      }
    };

    // Setup and cleanup
    setupVideos();
    timelineRef.current?.addEventListener("mousedown", handleTimelineClick);
    timerRef.current = window.setInterval(checkProgress, 50);

    if (!isSeekingRef.current) {
      playVideo(videoRefs.current[activeVideoIndexRef.current]);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timelineRef.current?.removeEventListener(
        "mousedown",
        handleTimelineClick
      );
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
