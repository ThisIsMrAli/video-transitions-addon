import React, { useEffect, useRef } from "react";
import Lottie from "lottie-web";

const TransitionOverlay = ({
  layers,
  currentTime,
  totalDuration,
  activeVideoIndex,
  getVideoDuration,
}) => {
  const lottieContainerRef = useRef(null);
  const lottieAnimationRef = useRef(null);
  const currentTransitionIndexRef = useRef(0);

  useEffect(() => {
    const transitionLayers = layers.filter(
      (layer) => layer.assetType === "transition"
    );
    if (transitionLayers.length === 0) return;

    const currentTransitionLayer =
      transitionLayers[currentTransitionIndexRef.current];

    // Simplified trigger: play at currentTime = 1

    console.log("Starting transition animation at time:", currentTime);
    console.log(currentTransitionLayer);
    lottieAnimationRef.current = Lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      animationData: currentTransitionLayer.animationData,
    });

    lottieAnimationRef.current.addEventListener("complete", () => {
      console.log("Transition animation complete");
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }
      currentTransitionIndexRef.current =
        (currentTransitionIndexRef.current + 1) % transitionLayers.length;
    });

    return () => {
      if (lottieAnimationRef.current) {
        lottieAnimationRef.current.destroy();
        lottieAnimationRef.current = null;
      }
    };
  }, [layers, currentTime]);

  return (
    <div
      ref={lottieContainerRef}
      className="absolute inset-0 pointer-events-none"
      style={{
        zIndex: 10,
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
