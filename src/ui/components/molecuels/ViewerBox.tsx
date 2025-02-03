import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
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

  // Memoize video layers
  const videoLayers = useMemo(
    () => layers.filter((layer) => layer.assetType === "media"),
    [layers]
  );

  // Memoized utility functions
  const getVideoDuration = useCallback(
    (index: number) => {
      const layer = videoLayers[index];
      if (layer?.changedTrims && layer.end != null && layer.start != null) {
        return layer.end - layer.start;
      }
      return videoRefs.current[index]?.duration || 0;
    },
    [videoLayers]
  );

  const getTotalDuration = useCallback(() => {
    return videoLayers.reduce(
      (total, _, index) => total + getVideoDuration(index),
      0
    );
  }, [videoLayers, getVideoDuration]);

  const getCurrentTime = useCallback(() => {
    const activeIndex = activeVideoIndexRef.current;
    const previousDuration = videoLayers
      .slice(0, activeIndex)
      .reduce((total, _, index) => total + getVideoDuration(index), 0);

    const currentVideo = videoRefs.current[activeIndex];
    const currentLayer = videoLayers[activeIndex];

    if (currentLayer?.changedTrims) {
      const videoCurrentTime = currentVideo?.currentTime || 0;
      const trimStart = currentLayer.start || 0;
      return previousDuration + (videoCurrentTime - trimStart);
    }

    return previousDuration + (currentVideo?.currentTime || 0);
  }, [videoLayers, getVideoDuration]);

  // Video cleanup utility
  const cleanupVideo = useCallback(
    (video: HTMLVideoElement | undefined, index: number) => {
      if (video) {
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
      }

      const blobUrl = blobUrlsRef.current.get(index);
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        blobUrlsRef.current.delete(index);
      }
    },
    []
  );

  // Video creation utility
  const createVideoElement = useCallback(
    (layer: (typeof videoLayers)[0], index: number) => {
      cleanupVideo(videoRefs.current[index], index);

      const video = document.createElement("video");
      const blobUrl = URL.createObjectURL(layer.orgFile);
      blobUrlsRef.current.set(index, blobUrl);

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

      video.onerror = () => {
        cleanupVideo(video, index);
        const newVideo = createVideoElement(layer, index);
        videoRefs.current[index] = newVideo;
      };

      if (layer.changedTrims && layer.start) {
        video.currentTime = layer.start;
      }

      containerRef.current?.appendChild(video);
      return video;
    },
    [cleanupVideo]
  );

  // Video playback control
  const playVideo = useCallback(async (video: HTMLVideoElement) => {
    try {
      await video.play();
    } catch (err) {
      console.error("Playback failed:", err);
    }
  }, []);

  const switchToVideo = useCallback(
    async (index: number, targetTime = 0) => {
      videoRefs.current.forEach((v) => {
        v.pause();
        v.style.opacity = "0";
      });

      const targetVideo = videoRefs.current[index];
      const layer = videoLayers[index];

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
    },
    [videoLayers, playVideo]
  );

  // Timeline click handler
  const handleTimelineClick = useCallback(
    async (e: MouseEvent) => {
      if (!timelineRef.current || videoLayers.length === 0) return;
      isSeekingRef.current = true;

      const rect = timelineRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const targetTime = getTotalDuration() * clickPosition;

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
    },
    [videoLayers, getTotalDuration, getVideoDuration, switchToVideo]
  );

  // Main effect for video setup and playback
  useEffect(() => {
    if (!containerRef.current || videoLayers.length === 0) return;

    const setupVideos = () => {
      videoRefs.current = videoLayers.map(createVideoElement);
    };

    const checkProgress = () => {
      if (isSeekingRef.current) return;

      const currentVideo = videoRefs.current[activeVideoIndexRef.current];
      const currentLayer = videoLayers[activeVideoIndexRef.current];
      if (!currentVideo) return;

      const videoDuration = getVideoDuration(activeVideoIndexRef.current);
      setProgress((getCurrentTime() / getTotalDuration()) * 100);

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

    setupVideos();
    timelineRef.current?.addEventListener("mousedown", handleTimelineClick);
    timerRef.current = window.setInterval(checkProgress, 50);

    if (!isSeekingRef.current) {
      playVideo(videoRefs.current[activeVideoIndexRef.current]);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      timelineRef.current?.removeEventListener(
        "mousedown",
        handleTimelineClick
      );

      videoRefs.current.forEach((video, index) => {
        cleanupVideo(video, index);
      });
      videoRefs.current = [];
      blobUrlsRef.current.clear();
    };
  }, [
    videoLayers,
    createVideoElement,
    handleTimelineClick,
    playVideo,
    switchToVideo,
    cleanupVideo,
    getCurrentTime,
    getTotalDuration,
    getVideoDuration,
  ]);

  return (
    <div className="relative w-full bg-black">
      <div
        className="relative w-full"
        style={{
          paddingTop: `${(aspectRatio.height / aspectRatio.width) * 100}%`,
        }}
      >
        <TransitionOverlay currentTime={getCurrentTime()} />
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

export default React.memo(ViewerBox);
