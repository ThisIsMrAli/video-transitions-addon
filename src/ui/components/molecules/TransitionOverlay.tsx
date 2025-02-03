import React, { useEffect, useRef, useState } from "react";
import Lottie from "lottie-web";
import { useAtom } from "jotai";
import { layersAtom } from "../../../store/general";
const TransitionOverlay = ({ currentTime }) => {
  const lottieContainerRef = useRef(null);
  const lottieAnimationRef = useRef(null);
  const currentTransitionIndexRef = useRef(0);
  const [layers, setLayers] = useAtom(layersAtom);
  const animationFrameRef = useRef(null);
  const getMergePoints = (layers) => {
    const mergePoints = [];
    const videoLayers = layers.filter((l) => l.assetType == "media");
    let cumulativeDuration = 0;
    videoLayers.forEach((layer, index) => {
      const start = layer.start;
      const end = layer.end;
      const duration = end - start;
      cumulativeDuration += duration;
      const mergePoint = cumulativeDuration;
      if (index < videoLayers.length - 1) mergePoints.push(mergePoint);
    });
    return mergePoints;
  };
  const [mergePoints, setMergePoints] = useState([]);

  useEffect(() => {
    setMergePoints(getMergePoints(layers));
  }, [layers]);

  useEffect(() => {
    const transitionLayers = layers.filter(
      (layer) => layer.assetType === "transition"
    );
    if (transitionLayers.length === 0) return;

    // Get marker time in seconds (converting from frames at 30fps)
    const markerTime =
      transitionLayers[0].animationData.markers[0].tm * (1 / 30);

    // Check if we're near any merge point, considering the marker offset
    const isNearMergePoint = mergePoints.some((point, index) => {
      const adjustedPoint = point - markerTime;
      // Show transition starting from marker time before merge point
      return currentTime >= adjustedPoint && currentTime <= point + 1;
    });

    if (!isNearMergePoint) {
      // If not near merge point, cleanup and return
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    // Find the current merge point we're transitioning at
    const currentMergePointIndex = mergePoints.findIndex((point) => {
      const adjustedPoint = point - markerTime;
      return currentTime >= adjustedPoint && currentTime <= point + 1;
    });
    currentTransitionIndexRef.current =
      currentMergePointIndex % transitionLayers.length;

    const currentTransitionLayer =
      transitionLayers[currentTransitionIndexRef.current];

    if (!lottieAnimationRef.current) {
      lottieAnimationRef.current = Lottie.loadAnimation({
        container: lottieContainerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: currentTransitionLayer.animationData,
      });
    }

    const updateFrame = () => {
      if (!lottieAnimationRef.current) return;

      const totalFrames = lottieAnimationRef.current.totalFrames;
      const currentMergePoint = mergePoints[currentMergePointIndex];
      const adjustedMergePoint = currentMergePoint - markerTime;

      // Calculate progress based on the adjusted timing
      const totalDuration = markerTime + 1; // marker time plus 1 second after merge point
      const progress = (currentTime - adjustedMergePoint) / totalDuration;
      const clampedProgress = Math.max(0, Math.min(1, progress));

      const frame = Math.floor(clampedProgress * (totalFrames - 1));
      const clampedFrame = Math.max(0, Math.min(frame, totalFrames - 1));

      lottieAnimationRef.current.goToAndStop(clampedFrame, true);

      animationFrameRef.current = requestAnimationFrame(updateFrame);
    };

    updateFrame();

    return () => {
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [layers, currentTime, mergePoints]);

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

export default TransitionOverlay;
