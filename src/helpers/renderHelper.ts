import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Lottie from "lottie-web";

// Create a function to get a new FFmpeg instance
async function createFFmpegInstance() {
  const ffmpeg = new FFmpeg();

  // Load FFmpeg in a new Worker
  await ffmpeg.load({
    coreURL: await toBlobURL(
      "./ffmpeg-core.js",
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      "./ffmpeg-core.wasm",
      "application/wasm"
    ),
  });

  return ffmpeg;
}

export const getVideoFps = async (videoUrl) => {
  try {
    let fps = 30; // Default value
    const ffmpeg = await createFFmpegInstance();

    ffmpeg.on("log", ({ message }) => {
      const fpsMatch = message.match(/(\d+(?:\.\d+)?) fps/);
      if (fpsMatch) {
        fps = parseFloat(fpsMatch[1]);
      }
    });

    const videoFile = await fetchFile(videoUrl);
    await ffmpeg.writeFile("input.mp4", videoFile);
    await ffmpeg.exec(["-i", "input.mp4", "-hide_banner"]);

    // Clean up
    await ffmpeg.terminate();

    return { fps };
  } catch (error) {
    console.error("Error getting video metadata:", error);
    return { fps: 30 };
  }
};

export const mergeVideos = async (
  videoInputs,
  onProgress,
  width,
  height,
  signal
) => {
  let ffmpegInstances = [];
  try {
    // Add signal check at the start of processing
    if (signal?.aborted) {
      throw new DOMException("Render aborted by user", "AbortError");
    }

    ffmpegInstances = await Promise.all(
      videoInputs.map(() => createFFmpegInstance())
    );

    // Add abort handler
    signal?.addEventListener("abort", () => {
      ffmpegInstances.forEach((instance) => {
        try {
          instance.terminate();
        } catch (error) {
          console.log("FFmpeg instance already terminated");
        }
      });
    });

    // Track durations for each video
    const durations = [];

    // Set up duration detection for each instance
    ffmpegInstances.forEach((ffmpeg, index) => {
      ffmpeg.on("log", ({ message }) => {
        const durationMatch = message.match(
          /Duration: (\d{2}):(\d{2}):(\d{2})\.(\d{2})/
        );
        if (durationMatch) {
          const [, hours, minutes, seconds, centiseconds] = durationMatch;
          durations[index] =
            parseFloat(hours) * 3600 +
            parseFloat(minutes) * 60 +
            parseFloat(seconds) +
            parseFloat(centiseconds) / 100;
        }
      });
    });

    // Track progress for each video
    const progressArray = new Array(videoInputs.length).fill(0);

    // Set up progress handlers for all instances
    ffmpegInstances.forEach((ffmpeg, index) => {
      ffmpeg.on("progress", ({ progress }) => {
        // Calculate the effective progress based on trimmed duration
        let effectiveProgress = progress;
        if (
          videoInputs[index].changedTrims &&
          videoInputs[index].start !== undefined &&
          videoInputs[index].end !== undefined
        ) {
          const fullDuration = durations[index] || 0;
          const trimmedDuration =
            videoInputs[index].end - videoInputs[index].start;
          // Adjust progress based on trim duration ratio
          effectiveProgress = (progress * fullDuration) / trimmedDuration;
          // Cap progress at 100%
          effectiveProgress = Math.min(effectiveProgress, 1);
        }
        progressArray[index] = effectiveProgress;
        if (onProgress) {
          const avgProgress =
            progressArray.reduce((a, b) => a + b) / progressArray.length;
          onProgress(avgProgress);
        }
      });
    });

    // Process all videos concurrently
    const processedData = await Promise.all(
      videoInputs.map(async (videoInput, index) => {
        const ffmpeg = ffmpegInstances[index];
        await ffmpeg.writeFile(
          "input.mp4",
          new Uint8Array(await videoInput.orgFile.arrayBuffer())
        );

        const ffmpegArgs = [];

        // Add trim arguments if changedTrims is true and start/end are provided
        if (
          videoInput.changedTrims &&
          videoInput.start !== undefined &&
          videoInput.end !== undefined
        ) {
          // Put -ss before input for faster seeking
          ffmpegArgs.push("-ss", videoInput.start.toString());
        }

        ffmpegArgs.push("-i", "input.mp4");

        // Add duration limit after input
        if (
          videoInput.changedTrims &&
          videoInput.start !== undefined &&
          videoInput.end !== undefined
        ) {
          ffmpegArgs.push("-t", (videoInput.end - videoInput.start).toString());
        }

        ffmpegArgs.push(
          "-vf",
          `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-threads",
          "0",
          "-r",
          "30",
          "-c:a",
          "aac",
          "-movflags",
          "+faststart",
          "output.mp4"
        );

        await ffmpeg.exec(ffmpegArgs);
        const data = await ffmpeg.readFile("output.mp4");
        await ffmpeg.terminate();
        return data;
      })
    );

    // Create final FFmpeg instance for merging
    const ffmpegFinal = await createFFmpegInstance();

    // Write all processed videos and create inputs.txt
    const inputsText = processedData
      .map((_, index) => `file 'temp${index}.mp4'`)
      .join("\n");

    for (let i = 0; i < processedData.length; i++) {
      await ffmpegFinal.writeFile(`temp${i}.mp4`, processedData[i]);
    }
    await ffmpegFinal.writeFile("inputs.txt", inputsText);

    // Concatenate all videos
    await ffmpegFinal.exec([
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      "inputs.txt",
      "-c",
      "copy",
      "output.mp4",
    ]);

    // Read final result
    const finalData = await ffmpegFinal.readFile("output.mp4");

    // Clean up
    for (let i = 0; i < processedData.length; i++) {
      await ffmpegFinal.deleteFile(`temp${i}.mp4`);
    }
    await ffmpegFinal.deleteFile("inputs.txt");
    await ffmpegFinal.deleteFile("output.mp4");
    await ffmpegFinal.terminate();

    // Calculate merge points (cumulative durations)
    const mergePoints = durations.reduce((acc, duration, index) => {
      const lastPoint = acc[acc.length - 1] || 0;
      // If video is trimmed, use the trimmed duration instead
      let videoDuration = duration;
      if (
        videoInputs[index].changedTrims &&
        videoInputs[index].start !== undefined &&
        videoInputs[index].end !== undefined
      ) {
        videoDuration = videoInputs[index].end - videoInputs[index].start;
      }
      acc.push(lastPoint + videoDuration);
      return acc;
    }, []);

    return { data: finalData, mergePoints };
  } catch (error) {
    // Clean up FFmpeg instances on error
    if (ffmpegInstances.length) {
      await Promise.all(
        ffmpegInstances.map(async (instance) => {
          try {
            await instance.terminate();
          } catch (terminateError) {
            console.log("FFmpeg instance already terminated");
          }
        })
      );
    }
    if (error.name === "AbortError") {
      throw error;
    } else {
      console.error("Merge videos error:", error);
      throw new Error("Failed to merge videos");
    }
  }
};

export async function convertLottieToPngSequenceAndBurn(
  lottieDataArray,
  videoMp4,
  onProgress,
  mergePoints,
  width,
  height,
  signal
) {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.visibility = "hidden";
  container.style.pointerEvents = "none";
  document.body.appendChild(container);

  let ffmpeg = null;
  try {
    if (signal?.aborted) {
      throw new DOMException("Render aborted by user", "AbortError");
    }

    ffmpeg = await createFFmpegInstance();

    // Add abort handler
    signal?.addEventListener("abort", () => {
      try {
        if (ffmpeg) {
          ffmpeg.terminate();
        }
      } catch (error) {
        console.log("FFmpeg instance already terminated");
      }
    });

    // Validate input arrays
    if (lottieDataArray.length !== mergePoints.length) {
      throw new Error(
       "Number of Lottie animations must match number of merge points"
      );
    }

    await ffmpeg.writeFile("input.mp4", videoMp4);

    // Get video dimensions
    let videoWidth, videoHeight;
    ffmpeg.on("log", ({ message }) => {
      const match = message.match(/Stream #0:0.*? (\d+)x(\d+)/);
      if (match) {
        videoWidth = parseInt(match[1]);
        videoHeight = parseInt(match[2]);
      }
    });
    await ffmpeg.exec(["-i", "input.mp4"]);

    // Calculate scaling parameters for the video
    const videoScaling = calculateScaling(
      videoWidth,
      videoHeight,
      width,
      height
    );

    // Process each Lottie animation
    let overlayCounter = 0;
    const frameInfos = [];

    for (let index = 0; index < lottieDataArray.length; index++) {
      const lottieData = lottieDataArray[index];
      const { fr: fps, w: lottieWidth, h: lottieHeight } = lottieData;

      // Calculate scaling parameters for the Lottie animation
      const lottieScaling = calculateScaling(
        lottieWidth,
        lottieHeight,
        width,
        height
      );

      // Generate Lottie frames using the container instead of svgRef
      const anim = Lottie.loadAnimation({
        container: container, // Use our hidden container
        renderer: "svg",
        loop: false,
        autoplay: false,
        animationData: lottieData,
      });

      await new Promise((resolve) =>
        anim.addEventListener("DOMLoaded", resolve)
      );

      const canvas = document.createElement("canvas");
      canvas.width = width; // Use target width
      canvas.height = height; // Use target height
      const ctx = canvas.getContext("2d", {
        willReadFrequently: true,
        alpha: true,
      }); // Enable alpha channel
      const serializer = new XMLSerializer();

      const lottieFrameCount = anim.getDuration(true);
      const startFrame = overlayCounter;
      frameInfos.push({
        startFrame,
        frameCount: lottieFrameCount,
        fps: fps,
      });

      // Generate PNG sequence for current animation
      for (let i = 0; i < lottieFrameCount; i++) {
        await new Promise((resolve) => {
          anim.goToAndStop(i, true);
          const svgElement = container.querySelector("svg");
          const svgString = serializer.serializeToString(svgElement);
          const img = new Image();

          img.onload = async () => {
            // Clear with transparent background
            ctx.clearRect(0, 0, width, height);

            // Set composite operation to maintain transparency
            ctx.globalCompositeOperation = "source-over";

            // Draw the image centered with proper scaling
            ctx.drawImage(
              img,
              lottieScaling.x,
              lottieScaling.y,
              lottieScaling.width,
              lottieScaling.height
            );

            // Use PNG format with alpha channel
            const dataUrl = canvas.toDataURL("image/png");
            const base64Data = dataUrl.split(",")[1];
            const binaryData = atob(base64Data);
            const frameData = new Uint8Array(binaryData.length);
            for (let j = 0; j < binaryData.length; j++) {
              frameData[j] = binaryData.charCodeAt(j);
            }

            await ffmpeg.writeFile(
              `overlay${index}_${i.toString().padStart(4, "0")}.png`,
              frameData
            );
            overlayCounter++;
            resolve(true);
          };

          // Log the SVG and image data with frame information
          // console.group(
          //   `Animation ${index} - Frame ${i}/${lottieFrameCount - 1}`
          // );
          // console.log("SVG String:", svgString);
          const imageUrl = `data:image/svg+xml;base64,${btoa(
            unescape(encodeURIComponent(svgString))
          )}`;
          // console.log("Image URL:", imageUrl);
          // console.log("Frame Details:", {
          //   animationIndex: index,
          //   currentFrame: i,
          //   totalFrames: lottieFrameCount,
          //   fps: fps,
          // });
          // console.groupEnd();
          img.src = imageUrl;
        });
      }

      anim.destroy();
    }

    // Update the FFmpeg filter complex to handle alpha channel correctly
    const filterParts = frameInfos.map((info, index) => {
      const mergePoint = mergePoints[index];
      const endPoint = mergePoints[index] + info.frameCount / info.fps;

      // Add debug logging to verify timing calculations
      // console.log("Overlay timing:", {
      //   animationIndex: index,
      //   startTime: mergePoint,
      //   endTime: endPoint,
      //   frameCount: info.frameCount,
      //   fps: info.fps,
      //   durationInSeconds: info.frameCount / info.fps,
      // });

      if (index === 0) {
        // First part includes video scaling
        return (
          `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[scaled];` +
          `[${index + 1}:v]setpts=PTS-STARTPTS+(${mergePoint.toFixed(
            3
          )}/TB)[overlay${index}];` +
          `[scaled][overlay${index}]overlay=0:0:format=auto:enable='between(t,${mergePoint.toFixed(
            3
          )},${endPoint.toFixed(3)})'[tmp${index + 1}]`
        );
      }

      return (
        `[${index + 1}:v]setpts=PTS-STARTPTS+(${mergePoint.toFixed(
          3
        )}/TB)[overlay${index}];` +
        `[tmp${index}][overlay${index}]overlay=0:0:format=auto:enable='between(t,${mergePoint.toFixed(
          3
        )},${endPoint.toFixed(3)})'[tmp${index + 1}]`
      );
    });

    const filterComplex = filterParts.join(";");

    // Set up progress handler
    ffmpeg.on("progress", ({ progress }) => {
      onProgress(progress);
    });

    // Add input arguments with explicit duration for each overlay
    const inputArgs = ["-i", "input.mp4"];
    frameInfos.forEach((info, index) => {
      inputArgs.push(
        "-framerate",
        info.fps.toString(),
        "-i",
        `overlay${index}_%04d.png`
      );
    });

    // Combine video with overlays, ensuring proper frame handling
    await ffmpeg.exec([
      ...inputArgs,
      "-filter_complex",
      filterComplex,
      "-map",
      `[tmp${frameInfos.length}]`,
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-preset",
      "ultrafast",
      "-threads",
      "0",
      "-crf",
      "23",
      "-movflags",
      "+faststart",
      "output.mp4",
    ]);

    const data = await ffmpeg.readFile("output.mp4");

    // Clean up - modified to handle multiple animation sequences
    for (let animIndex = 0; animIndex < lottieDataArray.length; animIndex++) {
      const frameCount = frameInfos[animIndex].frameCount;
      for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
        await ffmpeg.deleteFile(
          `overlay${animIndex}_${frameIndex.toString().padStart(4, "0")}.png`
        );
      }
    }
    await ffmpeg.deleteFile("input.mp4");
    await ffmpeg.deleteFile("output.mp4");
    await ffmpeg.terminate();

    onProgress(1);
    return new Blob([data], { type: "video/mp4" });
  } finally {
    // Clean up the container
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
  }
}

// Helper function to calculate scaling dimensions while maintaining aspect ratio
function calculateScaling(
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight
) {
  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let width, height, x, y;

  if (sourceRatio > targetRatio) {
    // Source is wider than target
    width = targetWidth;
    height = targetWidth / sourceRatio;
    x = 0;
    y = (targetHeight - height) / 2;
  } else {
    // Source is taller than target
    height = targetHeight;
    width = targetHeight * sourceRatio;
    x = (targetWidth - width) / 2;
    y = 0;
  }

  return { width, height, x, y };
}

export function downloadUint8ArrayAsMP4(uint8Array, filename) {
  // Step 1: Convert Uint8Array to Blob
  const blob = new Blob([uint8Array], { type: "video/mp4" });

  // Step 2: Create a URL for the Blob
  const url = URL.createObjectURL(blob);

  // Step 3: Create an Anchor Element and Trigger Download
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download.mp4";
  document.body.appendChild(a);
  a.click();

  // // Cleanup: Revoke the Object URL and remove the anchor element
  // window.URL.revokeObjectURL(url);
  // a.remove();
}
