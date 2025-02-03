import React, { useEffect, useRef, useState } from "react";
import Lottie from "lottie-web";
import { useAtom } from "jotai";
import { layersAtom } from "../../../store/general";
const TransitionOverlay = ({ currentTime }) => {
  const lottieContainerRef = useRef(null);
  const lottieAnimationRef = useRef(null);
  const currentTransitionIndexRef = useRef(0);
  const [layers, setLayers] = useAtom(layersAtom);
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
      mergePoints.push(mergePoint);
    });
    return mergePoints;
  };
  const [mergePoints, setMergePoints] = useState([]);
  console.log("mergePoints", mergePoints);

  useEffect(() => {
    setMergePoints(getMergePoints(layers));
  }, [layers]);

  useEffect(() => {
    const transitionLayers = layers.filter(
      (layer) => layer.assetType === "transition"
    );
    if (transitionLayers.length === 0) return;

    // Check if we're near any merge point
    const isNearMergePoint = mergePoints.some((point) => {
      // Show transition 1 second before and after merge point
      return Math.abs(currentTime - point) <= 1;
    });

    if (!isNearMergePoint) {
      // If not near merge point, cleanup and return
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }
      return;
    }

    // Find the current merge point we're transitioning at
    const currentMergePointIndex = mergePoints.findIndex(
      (point) => Math.abs(currentTime - point) <= 1
    );
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

    const totalFrames = lottieAnimationRef.current.totalFrames;
    // Calculate progress based on distance from merge point
    // -1 to 0 seconds -> 0 to 0.5 progress
    // 0 to 1 seconds -> 0.5 to 1 progress
    const distanceFromMergePoint =
      currentTime - mergePoints[currentMergePointIndex];
    const progress = (distanceFromMergePoint + 1) / 2; // Convert -1,1 range to 0,1 range
    const frame = Math.floor(progress * (totalFrames - 1));

    lottieAnimationRef.current.goToAndStop(frame, true);

    return () => {
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
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
