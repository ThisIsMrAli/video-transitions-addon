import React, { useEffect, useRef, useState } from "react";
import { layersAtom } from "../../../store/general";
import { useAtom } from "jotai";
import lottie from "lottie-web";

const TRANSITION_OVERLAP = 0.75; // 750ms overlap for transitions

const ViewerBox = () => {
  const [layers] = useAtom(layersAtom);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});
  const lottieRef = useRef<any>(null);
  const lottieContainerRef = useRef<HTMLDivElement>(null);

  const playVideo = async (
    videoRef: HTMLVideoElement,
    startTime: number,
    endTime: number
  ) => {
    return new Promise<void>((resolve) => {
      if (!videoRef) {
        resolve();
        return;
      }

      videoRef.currentTime = startTime;
      videoRef.style.display = "block";
      videoRef.style.opacity = "1";

      const onTimeUpdate = () => {
        if (videoRef.currentTime >= endTime) {
          videoRef.removeEventListener("timeupdate", onTimeUpdate);
          resolve();
        }
      };

      videoRef.addEventListener("timeupdate", onTimeUpdate);
      const playPromise = videoRef.play();
      if (playPromise) {
        playPromise.catch((error) => {
          console.error("Error playing video:", error);
          resolve();
        });
      }
    });
  };

  const playTransition = async (
    video1Ref: HTMLVideoElement,
    video2Ref: HTMLVideoElement,
    transitionData: any
  ) => {
    return new Promise<void>((resolve) => {
      if (!lottieContainerRef.current) {
        resolve();
        return;
      }

      // Update Lottie animation
      if (lottieRef.current) {
        lottieRef.current.destroy();
      }

      lottieRef.current = lottie.loadAnimation({
        container: lottieContainerRef.current,
        animationData: transitionData,
        loop: false,
        autoplay: false,
      });

      lottieContainerRef.current.style.display = "block";
      lottieRef.current.goToAndPlay(0);

      // Halfway through transition, switch videos
      setTimeout(() => {
        if (video1Ref) {
          video1Ref.pause();
          video1Ref.style.display = "none";
        }
        if (video2Ref) {
          video2Ref.style.display = "block";
          video2Ref.play();
        }
      }, (lottieRef.current.getDuration() * 1000) / 2);

      lottieRef.current.addEventListener(
        "complete",
        () => {
          if (lottieContainerRef.current) {
            lottieContainerRef.current.style.display = "none";
          }
          resolve();
        },
        { once: true }
      );
    });
  };

  const playSequence = async () => {
    setIsPlaying(true);
    const videos = layers.filter((layer) => layer.assetType === "media");

    try {
      // Hide all videos initially
      Object.values(videoRefs.current).forEach((ref) => {
        if (ref) {
          ref.style.display = "none";
          ref.style.opacity = "1";
        }
      });

      for (let i = 0; i < videos.length; i++) {
        const currentVideo = videos[i];
        const nextVideo = videos[i + 1];
        const currentVideoRef = videoRefs.current[currentVideo.id];
        const nextVideoRef = nextVideo ? videoRefs.current[nextVideo.id] : null;

        const transitionIndex = layers.findIndex(
          (layer) =>
            layer.assetType === "transition" &&
            layers.indexOf(currentVideo) < layers.indexOf(layer) &&
            (nextVideo
              ? layers.indexOf(layer) < layers.indexOf(nextVideo)
              : true)
        );

        const hasTransition = transitionIndex !== -1 && nextVideo;
        const videoDuration = currentVideo.end - currentVideo.start;
        const videoStart = currentVideo.start;

        if (hasTransition) {
          const videoPromise = playVideo(
            currentVideoRef,
            videoStart,
            videoDuration
          );

          await new Promise((resolve) =>
            setTimeout(resolve, (videoDuration - TRANSITION_OVERLAP) * 1000)
          );

          await playTransition(
            currentVideoRef,
            nextVideoRef,
            layers[transitionIndex].animationData
          );

          await videoPromise;
        } else {
          await playVideo(currentVideoRef, videoStart, videoDuration);
        }
      }
    } catch (error) {
      console.error("Error in playSequence:", error);
    }

    setIsPlaying(false);
  };

  useEffect(() => {
    playSequence();
  }, [layers]);

  return (
    <div className="w-[280px] h-[158px] bg-[#FBFBFB] border border-solid border-[#EBEBEB] rounded-[8px] flex flex-col items-center justify-center overflow-hidden relative">
      {layers.length > 0 ? (
        <>
          {layers
            .filter((layer) => layer.assetType === "media")
            .map((layer) => (
              <video
                key={layer.id}
                ref={(el) => {
                  if (el) videoRefs.current[layer.id] = el;
                }}
                className="absolute w-full h-full object-cover"
                src={layer.file}
                style={{
                  display: "none",
                  opacity: 1,
                  transition: "opacity 0.1s ease-in-out",
                }}
                preload="auto"
                muted
              />
            ))}
          <div
            ref={lottieContainerRef}
            className="absolute inset-0 z-10"
            style={{
              display: "none",
              opacity: 1,
              transition: "opacity 0.1s ease-in-out",
            }}
          />
        </>
      ) : (
        <h3 className="text-[#c1c1c1] text-center text-[30px] font-[400] m-0 p-0 leading-[36px]">
          viewer <br /> box
        </h3>
      )}
    </div>
  );
};

export default ViewerBox;
