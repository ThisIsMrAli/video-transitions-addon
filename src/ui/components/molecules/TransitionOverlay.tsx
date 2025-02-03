import React, {
  useEffect,
  useRef,
  useState,
  useMemo,
  useCallback,
} from "react";
import Lottie from "lottie-web";
import { useAtom } from "jotai";
import { layersAtom } from "../../../store/general";

const TransitionOverlay = ({ currentTime }) => {
  const lottieContainerRef = useRef(null);
  const lottieAnimationRef = useRef(null);
  const currentTransitionIndexRef = useRef(0);
  const [layers] = useAtom(layersAtom); // Only read from layersAtom
  const animationFrameRef = useRef(null);
  const lastMergePointIndexRef = useRef(-1);

  // Memoize video layers and transition layers
  const { videoLayers, transitionLayers } = useMemo(
    () => ({
      videoLayers: layers.filter((l) => l.assetType === "media"),
      transitionLayers: layers.filter((l) => l.assetType === "transition"),
    }),
    [layers]
  );

  // Memoize merge points calculation
  const mergePoints = useMemo(() => {
    let cumulativeDuration = 0;
    return videoLayers.map((layer) => {
      const duration = layer.end - layer.start;
      cumulativeDuration += duration;
      return cumulativeDuration;
    });
  }, [videoLayers]);

  // Memoize marker time calculation
  const markerTime = useMemo(() => {
    if (!transitionLayers.length) return 0;
    return transitionLayers[0].animationData.markers[0].tm * (1 / 30);
  }, [transitionLayers]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (lottieAnimationRef.current) {
      lottieAnimationRef.current.destroy();
      lottieAnimationRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Initialize Lottie animation
  const initLottieAnimation = useCallback((transitionLayer) => {
    if (!lottieContainerRef.current) return null;

    return Lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: transitionLayer.animationData,
    });
  }, []);

  useEffect(() => {
    if (transitionLayers.length === 0) return cleanup;

    // Find current merge point and check if we're near it
    const currentMergePointIndex = mergePoints.findIndex((point) => {
      const adjustedPoint = point - markerTime;
      return currentTime >= adjustedPoint && currentTime <= point + 1;
    });

    // If we're not near any merge point or same as last frame, cleanup and return
    if (currentMergePointIndex === -1) {
      cleanup();
      return;
    }

    // Optimize by preventing unnecessary re-renders for the same merge point
    if (
      currentMergePointIndex === lastMergePointIndexRef.current &&
      lottieAnimationRef.current
    ) {
      return;
    }

    lastMergePointIndexRef.current = currentMergePointIndex;
    currentTransitionIndexRef.current =
      currentMergePointIndex % transitionLayers.length;

    // Initialize new animation if needed
    if (!lottieAnimationRef.current) {
      cleanup();
      lottieAnimationRef.current = initLottieAnimation(
        transitionLayers[currentTransitionIndexRef.current]
      );
    }

    const updateFrame = () => {
      if (!lottieAnimationRef.current) return;

      const totalFrames = lottieAnimationRef.current.totalFrames;
      const currentMergePoint = mergePoints[currentMergePointIndex];
      const adjustedMergePoint = currentMergePoint - markerTime;

      // Calculate progress
      const totalDuration = markerTime + 1;
      const progress = (currentTime - adjustedMergePoint) / totalDuration;
      const clampedProgress = Math.max(0, Math.min(1, progress));

      const frame = Math.floor(clampedProgress * (totalFrames - 1));
      const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));

      lottieAnimationRef.current.goToAndStop(clampedFrame, true);
      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    updateFrame();
    return cleanup;
  }, [
    layers,
    currentTime,
    cleanup,
    initLottieAnimation,
    markerTime,
    mergePoints,
    transitionLayers,
  ]);

  return (
    <div
      ref={lottieContainerRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 9999,
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
};

export default React.memo(TransitionOverlay);
