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


  useEffect(() => {
    setMergePoints(getMergePoints(layers));
  }, [layers]);

  useEffect(() => {
    const transitionLayers = layers.filter(
      (layer) => layer.assetType === "transition"
    );
    if (transitionLayers.length === 0) return;

    const currentTransitionLayer =
      transitionLayers[currentTransitionIndexRef.current];

    lottieAnimationRef.current = Lottie.loadAnimation({
      container: lottieContainerRef.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: currentTransitionLayer.animationData,
    });

    const totalFrames = lottieAnimationRef.current.totalFrames;

    const progress = Math.min(Math.max(currentTime - 1, 0), 1);
    const frame = Math.floor(progress * (totalFrames - 1));

    lottieAnimationRef.current.goToAndStop(frame, true);

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
