import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Create a function to get a new FFmpeg instance
async function createFFmpegInstance() {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
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

export const mergeVideos = async (video1, video2, onProgress) => {
  try {
    // Create two FFmpeg instances for parallel processing
    const [ffmpeg1, ffmpeg2] = await Promise.all([
      createFFmpegInstance(),
      createFFmpegInstance(),
    ]);

    // Set up progress handlers for both instances
    let progress1 = 0;
    let progress2 = 0;

    ffmpeg1.on("progress", ({ progress }) => {
      progress1 = progress;
      if (onProgress) {
        onProgress((progress1 + progress2) / 2);
      }
    });

    ffmpeg2.on("progress", ({ progress }) => {
      progress2 = progress;
      if (onProgress) {
        onProgress((progress1 + progress2) / 2);
      }
    });

    // Process both videos concurrently
    const [data1, data2] = await Promise.all([
      // Process first video
      (async () => {
        await ffmpeg1.writeFile(
          "input.mp4",
          new Uint8Array(await video1.arrayBuffer())
        );
        await ffmpeg1.exec([
          "-i",
          "input.mp4",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-r",
          "30",
          "-c:a",
          "aac",
          "output.mp4",
        ]);
        const data = await ffmpeg1.readFile("output.mp4");
        await ffmpeg1.terminate();
        return data;
      })(),
      // Process second video
      (async () => {
        await ffmpeg2.writeFile(
          "input.mp4",
          new Uint8Array(await video2.arrayBuffer())
        );
        await ffmpeg2.exec([
          "-i",
          "input.mp4",
          "-c:v",
          "libx264",
          "-preset",
          "medium",
          "-r",
          "30",
          "-c:a",
          "aac",
          "output.mp4",
        ]);
        const data = await ffmpeg2.readFile("output.mp4");
        await ffmpeg2.terminate();
        return data;
      })(),
    ]);

    // Create final FFmpeg instance for merging
    const ffmpegFinal = await createFFmpegInstance();

    // Write both processed videos
    await ffmpegFinal.writeFile("temp1.mp4", data1);
    await ffmpegFinal.writeFile("temp2.mp4", data2);
    await ffmpegFinal.writeFile(
      "inputs.txt",
      "file 'temp1.mp4'\nfile 'temp2.mp4'"
    );

    // Concatenate the videos
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
    const blob = new Blob([finalData], { type: "video/mp4" });

    // Clean up
    await ffmpegFinal.deleteFile("temp1.mp4");
    await ffmpegFinal.deleteFile("temp2.mp4");
    await ffmpegFinal.deleteFile("inputs.txt");
    await ffmpegFinal.deleteFile("output.mp4");
    await ffmpegFinal.terminate();

    return blob;
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
