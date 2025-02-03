import React, { useEffect, useRef, useState } from "react";
import { aspectRatioAtom, layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import TransitionOverlay from "../molecules/TransitionOverlay";

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
  const blobUrlsRef = useRef<Map<number, string>>(new Map());

  const getCurrentTime = () => {
    const activeIndex = activeVideoIndexRef.current;
    const previousDuration = layers
      .filter((layer) => layer.assetType === "media")
      .slice(0, activeIndex)
      .reduce((total, _, index) => total + getVideoDuration(index), 0);

    const currentVideo = videoRefs.current[activeIndex];
    const currentLayer = layers.filter((layer) => layer.assetType === "media")[
      activeIndex
    ];

    if (currentLayer?.changedTrims) {
      const videoCurrentTime = currentVideo?.currentTime || 0;
      const trimStart = currentLayer.start || 0;
      return previousDuration + (videoCurrentTime - trimStart);
    }

    return previousDuration + (currentVideo?.currentTime || 0);
  };

  const getVideoDuration = (index) => {
    const layer = layers.filter((layer) => layer.assetType === "media")[index];
    if (layer?.changedTrims && layer.end != null && layer.start != null) {
      return layer.end - layer.start;
    }
    return videoRefs.current[index]?.duration || 0;
  };

  const getTotalDuration = () => {
    return layers
      .filter((layer) => layer.assetType === "media")
      .reduce((total, _, index) => total + getVideoDuration(index), 0);
  };

  useEffect(() => {
    const videoLayers = layers.filter((layer) => layer.assetType === "media");
    if (!containerRef.current || videoLayers.length === 0) return;

    // Cleanup function for a single video
    const cleanupVideo = (
      video: HTMLVideoElement | undefined,
      index: number
    ) => {
      if (video) {
        video.pause();
        video.removeAttribute("src"); // Remove source before cleanup
        video.load(); // Reset video element
        video.remove();
      }

      const blobUrl = blobUrlsRef.current.get(index);
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
          blobUrlsRef.current.delete(index);
        } catch (error) {
          console.log("Failed to revoke URL for index", index, error);
        }
      }
    };

    // Cleanup all existing videos
    videoRefs.current.forEach((video, index) => {
      cleanupVideo(video, index);
    });
    videoRefs.current = [];
    blobUrlsRef.current.clear();

    // Utility functions
    const getVideoStartTime = (index: number) => {
      const layer = videoLayers[index];
      return layer.changedTrims ? layer.start || 0 : 0;
    };

    // Video creation and setup
    const createVideoElement = (
      layer: (typeof videoLayers)[0],
      index: number
    ) => {
      // Cleanup any existing video at this index
      cleanupVideo(videoRefs.current[index], index);

      const video = document.createElement("video");

      // Create and store blob URL
      const blobUrl = URL.createObjectURL(layer.orgFile);
      blobUrlsRef.current.set(index, blobUrl);

      // Configure video
      video.src = blobUrl;
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

      // Handle errors
      video.onerror = (e) => {
        console.log("Video error:", e);
        // Attempt to recreate the video element if there's an error
        cleanupVideo(video, index);
        const newVideo = createVideoElement(layer, index);
        videoRefs.current[index] = newVideo;
      };

      // Set initial time if trimmed
      if (layer.changedTrims && layer.start) {
        video.currentTime = layer.start;
      }

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
        // console.log("Playback failed:", err);
      }
    };

    const switchToVideo = async (index: number, targetTime = 0) => {
      videoRefs.current.forEach((v) => {
        v.pause();
        v.style.opacity = "0";
      });

      const targetVideo = videoRefs.current[index];
      const layer = videoLayers[index];

      // Calculate actual video time considering trim
      let actualVideoTime = targetTime;
      if (layer.changedTrims) {
        actualVideoTime += layer.start || 0;
      }

      targetVideo.currentTime = actualVideoTime;

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
      const currentLayer = layers.filter(
        (layer) => layer.assetType === "media"
      )[activeVideoIndexRef.current];
      if (!currentVideo) return;

      const videoDuration = getVideoDuration(activeVideoIndexRef.current);
      setProgress((getCurrentTime() / getTotalDuration()) * 100);

      // Check if current video reached its trim end or natural end
      let shouldSwitchVideo = false;
      if (currentLayer.changedTrims) {
        shouldSwitchVideo =
          currentVideo.currentTime >=
          (currentLayer.end || currentVideo.duration);
      } else {
        shouldSwitchVideo = currentVideo.currentTime >= videoDuration;
      }

      if (shouldSwitchVideo) {
        const nextIndex =
          activeVideoIndexRef.current === videoRefs.current.length - 1
            ? 0
            : activeVideoIndexRef.current + 1;
        switchToVideo(nextIndex, 0);
      }
    };

    // Initial setup
    setupVideos();
    timelineRef.current?.addEventListener("mousedown", handleTimelineClick);
    timerRef.current = window.setInterval(checkProgress, 50);

    if (!isSeekingRef.current) {
      playVideo(videoRefs.current[activeVideoIndexRef.current]);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timelineRef.current?.removeEventListener(
        "mousedown",
        handleTimelineClick
      );

      // Clean up all videos and blob URLs
      videoRefs.current.forEach((video, index) => {
        cleanupVideo(video, index);
      });
      videoRefs.current = [];
      blobUrlsRef.current.clear();
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
        <div className="absolute inset-0 z-10 bg-transparent">
         
          <TransitionOverlay
            layers={layers}
            currentTime={getCurrentTime()}
            totalDuration={getTotalDuration()}
            activeVideoIndex={activeVideoIndexRef.current}
            getVideoDuration={getVideoDuration}
          />
        </div>
        <div ref={containerRef} className="absolute inset-0 z-0" />
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
