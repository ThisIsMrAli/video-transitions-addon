import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import Lottie from "lottie-web";

// Create a function to get a new FFmpeg instance
async function createFFmpegInstance() {
  const ffmpeg = new FFmpeg();

  // Load FFmpeg in a new Worker
  await ffmpeg.load({
    coreURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
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

export const mergeVideos = async (videos, onProgress) => {
  try {
    // Create FFmpeg instances for each video
    const ffmpegInstances = await Promise.all(
      videos.map(() => createFFmpegInstance())
    );

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
    const progressArray = new Array(videos.length).fill(0);

    // Set up progress handlers for all instances
    ffmpegInstances.forEach((ffmpeg, index) => {
      ffmpeg.on("progress", ({ progress }) => {
        progressArray[index] = progress;
        if (onProgress) {
          // Calculate average progress across all videos
          const avgProgress =
            progressArray.reduce((a, b) => a + b) / progressArray.length;
          onProgress(avgProgress);
        }
      });
    });

    // Process all videos concurrently
    const processedData = await Promise.all(
      videos.map(async (video, index) => {
        const ffmpeg = ffmpegInstances[index];
        await ffmpeg.writeFile(
          "input.mp4",
          new Uint8Array(await video.arrayBuffer())
        );
        await ffmpeg.exec([
          "-i",
          "input.mp4",
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
          "output.mp4",
        ]);
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
    const mergePoints = durations.reduce((acc, duration) => {
      const lastPoint = acc[acc.length - 1] || 0;
      acc.push(lastPoint + duration);
      return acc;
    }, []);

    return { data: finalData, mergePoints };
  } catch (error) {
    console.error("Error merging videos:", error);
    throw error;
  }
};

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

export async function convertLottieToPngSequenceAndBurn(
  lottieDataArray,
  videoMp4,
  onProgress,
  svgRef,
  mergePoints,
  width,
  height
) {
  // Validate input arrays
  if (lottieDataArray.length !== mergePoints.length) {
    throw new Error(
      "Number of Lottie animations must match number of merge points"
    );
  }

  // Create FFmpeg instance
  const ffmpeg = await createFFmpegInstance();
  await ffmpeg.writeFile("input.mp4", videoMp4);

  // Process each Lottie animation
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

    // Create canvas for WebM recording
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
      alpha: true,
    });

    // Set up MediaRecorder for WebM
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8",
      videoBitsPerSecond: 8000000, // Adjust as needed
    });

    const chunks = [];
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);

    // Generate Lottie animation
    const anim = Lottie.loadAnimation({
      container: svgRef.current,
      renderer: "svg",
      loop: false,
      autoplay: false,
      animationData: lottieData,
    });

    await new Promise((resolve) => anim.addEventListener("DOMLoaded", resolve));

    const serializer = new XMLSerializer();
    const frameCount = anim.totalFrames;

    frameInfos.push({
      frameCount,
      fps: fps,
    });

    // Start recording
    mediaRecorder.start();

    // Render each frame
    for (let i = 0; i < frameCount; i++) {
      await new Promise((resolve) => {
        anim.goToAndStop(i, true);
        requestAnimationFrame(async () => {
          const svgElement = svgRef.current.querySelector("svg");
          const svgString = serializer.serializeToString(svgElement);
          const img = new Image();

          img.onload = () => {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(
              img,
              lottieScaling.x,
              lottieScaling.y,
              lottieScaling.width,
              lottieScaling.height
            );
            resolve(true);
          };

          const imageUrl = `data:image/svg+xml;base64,${btoa(
            unescape(encodeURIComponent(svgString))
          )}`;
          img.src = imageUrl;
        });
      });
    }

    // Stop recording and wait for data
    mediaRecorder.stop();
    await new Promise((resolve) => (mediaRecorder.onstop = resolve));

    // Convert chunks to buffer and write to FFmpeg
    const webmBlob = new Blob(chunks, { type: "video/webm" });
    const webmBuffer = await webmBlob.arrayBuffer();
    await ffmpeg.writeFile(`overlay${index}.webm`, new Uint8Array(webmBuffer));

    anim.destroy();
  }

  // Update the FFmpeg filter complex for WebM overlays
  const filterParts = frameInfos.map((info, index) => {
    const mergePoint = mergePoints[index];
    const endPoint = mergePoints[index] + info.frameCount / info.fps;

    if (index === 0) {
      return (
        `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[scaled];` +
        `[${index + 1}:v]setpts=PTS-STARTPTS+(${mergePoint.toFixed(
          3
        )}/TB)[overlay${index}];` +
        `[scaled][overlay${index}]overlay=0:0:enable='between(t,${mergePoint.toFixed(
          3
        )},${endPoint.toFixed(3)})'[tmp${index + 1}]`
      );
    }

    return (
      `[${index + 1}:v]setpts=PTS-STARTPTS+(${mergePoint.toFixed(
        3
      )}/TB)[overlay${index}];` +
      `[tmp${index}][overlay${index}]overlay=0:0:enable='between(t,${mergePoint.toFixed(
        3
      )},${endPoint.toFixed(3)})'[tmp${index + 1}]`
    );
  });

  const filterComplex = filterParts.join(";");

  // Set up progress handler
  ffmpeg.on("progress", ({ progress }) => {
    onProgress(progress);
  });

  // Add input arguments for WebM files
  const inputArgs = ["-i", "input.mp4"];
  frameInfos.forEach((_, index) => {
    inputArgs.push("-i", `overlay${index}.webm`);
  });

  // Combine video with overlays
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

  // Clean up
  for (let i = 0; i < lottieDataArray.length; i++) {
    await ffmpeg.deleteFile(`overlay${i}.webm`);
  }
  await ffmpeg.deleteFile("input.mp4");
  await ffmpeg.deleteFile("output.mp4");
  await ffmpeg.terminate();

  onProgress(1);
  return new Blob([data], { type: "video/mp4" });
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
