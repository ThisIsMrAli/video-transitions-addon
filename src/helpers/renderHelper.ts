import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
export const ffmpeg = new FFmpeg();

const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/";
await ffmpeg.load({
  coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
  wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  //  coreURL: `./ffmpeg-core.js`,
  // wasmURL: `./ffmpeg-core.wasm`,
});

export const getVideoFps = async (videoUrl) => {
  try {
    let fps = 30; // Default value

    ffmpeg.on("log", ({ message }) => {
      const fpsMatch = message.match(/(\d+(?:\.\d+)?) fps/);
      if (fpsMatch) {
        fps = parseFloat(fpsMatch[1]);
      }
    });

    const videoFile = await fetchFile(videoUrl);
    await ffmpeg.writeFile("input.mp4", videoFile);
    await ffmpeg.exec(["-i", "input.mp4", "-hide_banner"]);

    return { fps };
  } catch (error) {
    console.error("Error getting video metadata:", error);
    return { fps: 30 };
  }
};

export const mergeVideos = async (
  video1,
  video2,
  onProgress
 ) => {
  try {
    // Set up progress tracking
    ffmpeg.on("progress", ({ progress }) => {
      if (onProgress) {
        onProgress(progress);
      }
    });

    // Write both input videos directly to FFmpeg's virtual filesystem
    await ffmpeg.writeFile(
      "input1.mp4",
      new Uint8Array(await video1.arrayBuffer())
    );
    await ffmpeg.writeFile(
      "input2.mp4",
      new Uint8Array(await video2.arrayBuffer())
    );

    // First, transcode both videos to ensure compatibility
    await ffmpeg.exec([
      "-i",
      "input1.mp4",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-c:a",
      "aac",
      "temp1.mp4",
    ]);

    await ffmpeg.exec([
      "-i",
      "input2.mp4",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-c:a",
      "aac",
      "temp2.mp4",
    ]);

    // Create a file listing the transcoded videos
    await ffmpeg.writeFile("inputs.txt", "file 'temp1.mp4'\nfile 'temp2.mp4'");

    // Concatenate the transcoded videos
    await ffmpeg.exec([
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

    // Read the output file and return as blob
    const data = await ffmpeg.readFile("output.mp4");
    const blob = new Blob([data], { type: "video/mp4" });

    // Clean up all temporary files
    await ffmpeg.deleteFile("input1.mp4");
    await ffmpeg.deleteFile("input2.mp4");
    await ffmpeg.deleteFile("temp1.mp4");
    await ffmpeg.deleteFile("temp2.mp4");
    await ffmpeg.deleteFile("inputs.txt");
    await ffmpeg.deleteFile("output.mp4");

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
