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

export function convertFileToBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject("No file selected");
      return;
    }

    const reader = new FileReader();

    reader.onload = function () {
      resolve(reader.result);
    };

    reader.onerror = function (error) {
      reject(error);
    };

    reader.readAsDataURL(file);
  });
}

export const getVideoMetadata = async (videoUrl) => {
  try {
    let fps = 30; // Default value
    
    ffmpeg.on('log', ({ message }) => {
      const fpsMatch = message.match(/(\d+(?:\.\d+)?) fps/);
      if (fpsMatch) {
        fps = parseFloat(fpsMatch[1]);
      }
    });

    const videoFile = await fetchFile(videoUrl);
    await ffmpeg.writeFile('input.mp4', videoFile);
    await ffmpeg.exec(['-i', 'input.mp4', '-hide_banner']);

    return { fps };
  } catch (error) {
    console.error('Error getting video metadata:', error);
    return { fps: 30 };
  }
};

export const resizeTextureToStage = (app, texture, videoSprite) => {
  // Get the original dimensions of the texture
  const originalWidth = texture.width;
  const originalHeight = texture.height;

  // Calculate the aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  // Adjust the width and height to maintain the aspect ratio
  if (originalWidth / originalHeight > app.screen.width / app.screen.height) {
    // Landscape
    videoSprite.setSize(app.screen.width, app.screen.width / aspectRatio);
  } else {
    // Portrait or square
    videoSprite.setSize(app.screen.height * aspectRatio, app.screen.height);
  }
  // Center the sprite in the container
  videoSprite.x = (app.screen.width - videoSprite.width) / 2;
  videoSprite.y = (app.screen.height - videoSprite.height) / 2;
};

export function isNumber(value) {
  return typeof value === "number" && !isNaN(value);
}

export const progressUpdate = (
  progressObj,
  currentTime,
  duration,
  maxWidth
) => {
  // Calculate the percentage of elapsed time
  const percent = currentTime / duration;
  progressObj.width = maxWidth * percent;
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

export async function extractAudioFromVideo(videoFileBase64) {
  // Convert base64 to Uint8Array
  const binaryString = atob(videoFileBase64.split(",")[1]);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  ffmpeg.writeFile("input.mp4", bytes);

  const result = await ffmpeg.exec([
    "-i",
    "input.mp4",
    "-vn",
    "-acodec",
    "copy",
    "output.aac",
  ]);
  if (result > 0) {
    return null;
  }
  const audioData = ffmpeg.readFile("output.aac");
  // console.log("audioData", audioData);
  return audioData;
}
export const animate = (
  composerRef,
  sceneRef,
  cameraRef,
  rendererRef,
  meshRef,
  videoTextureRef,
  maxStageTime,
  animateTimerRef,
  HMEEncoderInstance,
  audioData,
  setRenderPercent,
  setRenderStep,
  onRenderComplete,
  isCanceled,
  fps
) => {
  const HMEencoder = HMEEncoderInstance.current;
  if (isCanceled.current) {
    HMEEncoderInstance.current.delete();
    return;
  }
  if (!composerRef.current) return;

  if (animateTimerRef.current > maxStageTime) {
    //finish render
    console.log("finished render");
    setRenderStep(1);

    HMEencoder.finalize();

    const videoData = HMEencoder.FS.readFile(HMEencoder.outputFilename);

    // Mux video and audio
    muxVideoAndAudio(videoData, audioData, setRenderPercent, maxStageTime).then(
      (finalVideoData) => {
        onRenderComplete(finalVideoData);
      }
    );
  } else {
    try {
      if (videoTextureRef.current && videoTextureRef.current.image) {
        const video = videoTextureRef.current.image;
        video.currentTime = animateTimerRef.current;

        // Wait for the video frame to be ready
        video.requestVideoFrameCallback(() => {
          videoTextureRef.current.needsUpdate = true;

          // Render the scene after the frame is ready
          composerRef.current.render();

          // Get the current frame and process it
          const gl = composerRef.current.renderer.getContext();
          const width = gl.drawingBufferWidth;
          const height = gl.drawingBufferHeight;

          const pixels = new Uint8Array(width * height * 4);
          gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

          // Flip the pixels vertically (WebGL returns them upside down)
          const flippedPixels = new Uint8Array(width * height * 4);
          for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
              const sourceIndex = (i * width + j) * 4;
              const targetIndex = ((height - i - 1) * width + j) * 4;
              flippedPixels[targetIndex] = pixels[sourceIndex];
              flippedPixels[targetIndex + 1] = pixels[sourceIndex + 1];
              flippedPixels[targetIndex + 2] = pixels[sourceIndex + 2];
              flippedPixels[targetIndex + 3] = pixels[sourceIndex + 3];
            }
          }

          setRenderPercent((animateTimerRef.current / maxStageTime) * 100);
          HMEencoder.addFrameRgba(flippedPixels);
          animateTimerRef.current += 1 / fps;

          // Request next frame after current one is processed
          requestAnimationFrame(() =>
            animate(
              composerRef,
              sceneRef,
              cameraRef,
              rendererRef,
              meshRef,
              videoTextureRef,
              maxStageTime,
              animateTimerRef,
              HMEEncoderInstance,
              audioData,
              setRenderPercent,
              setRenderStep,
              onRenderComplete,
              isCanceled,
              fps
            )
          );
        });
      }
    } catch (e) {
      console.error("Error in animate loop:", e);
    }
  }
};

async function muxVideoAndAudio(
  videoData,
  audioData,
  onProgress,
  maxStageTime
) {
  if (!audioData) return videoData;
  ffmpeg.writeFile("video.mp4", videoData);
  ffmpeg.writeFile("audio.aac", audioData);

  ffmpeg.on("log", ({ message }) => {
    const match = message.match(/time=(\d{2}:\d{2}:\d{2}.\d{2})/);
    if (match) {
      const time = match[1];
      const [hours, minutes, seconds] = time.split(":").map(parseFloat);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      // Calculate progress based on maxStageTime
      const progress = (totalSeconds / maxStageTime) * 100;
      onProgress(progress);
    }
  });
  if (audioData) {
    await ffmpeg.exec([
      "-i",
      "video.mp4",
      "-i",
      "audio.aac",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "output.mp4",
    ]);
  } else {
    await ffmpeg.exec([
      "-i",
      "video.mp4",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "output.mp4",
    ]);
  }
  const finalVideoData = await ffmpeg.readFile("output.mp4");

  return finalVideoData;
}

export function bindEnterKeyDownToClick(event) {
  if (event.keyCode === 13) {
    // enter key
    event.preventDefault(); // prevent default behavior
    event.stopPropagation(); // stop event from propagating
    event.target.click(); // programmatically trigger click event
  }
}
export const validNumber = (value) =>
  Math.round(value) % 2 === 0 ? Math.round(value) : Math.round(value) - 1;

export const varifyLicense = (purchaseCode, increaseUsage = false) => {
  return new Promise((resolve, reject) => {
    var data = {
      product_id: "EoNUzlEctgWds32C36HFEQ==",
      license_key: purchaseCode,
      increment_uses_count: increaseUsage,
    };
    fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (res) {
        resolve(res.success);
      })
      .catch((err) => {
        console.log("cant catch gumroad");
        reject(err);
      });
  });
};

export const registerHandler = async (addonSdk, setLicesed, setLicenseKey) => {
  try {
    const dialogResult = await addonSdk.app.showModalDialog({
      variant: "input",
      title: "Video Effects Pro Registration",

      description:
        "You are using the free version of Video Effects Pro with 20 high quality renders remaining. Upgrade your access by entering a license key.",
      buttonLabels: {
        primary: "Upgrade",
        secondary: "Purchase License Key",
        cancel: "Cancel",
      },
      field: {
        label: "License Key",
        placeholder: "Enter your license Key",
        fieldType: "text",
      },
    });
    console.log(dialogResult);
    if (
      dialogResult.buttonType == "primary" &&
      dialogResult.fieldValue &&
      dialogResult.fieldValue.length > 0
    ) {
      varifyLicense(dialogResult.fieldValue, true)
        .then((res) => {
          if (res == true) {
            console.log("registered");
            addonSdk.app.showModalDialog({
              variant: "confirmation",
              title: "Upgrade Success",
              description: "You now have unlimited access to Video Effects Pro",
              buttonLabels: { primary: "Ok" },
            });
            setLicesed(true);
            setLicenseKey(dialogResult.fieldValue);
          } else if (res == false) {
            console.log("invalid license");
            addonSdk.app.showModalDialog({
              variant: "error",
              title: "Invalid License Key",
              description:
                "Invalid License Key. Please check it again and try to Register.",
              buttonLabels: { primary: "Ok" },
            });
          }
        })
        .catch((err) => {
          addonSdk.app.showModalDialog({
            variant: "error",
            title: "Connection Error",
            description:
              "Couldnt Connect to License Server. Please check your connection and try again",
            buttonLabels: { primary: "Ok" },
          });
        });
    } else if (dialogResult.buttonType == "secondary") {
      openPopup("https://uxplugins.com/video-effects-pro", addonSdk);
    }
  } catch (error) {
    console.log("Error showing modal dialog:", error);
  }
};

export function openPopup(
  url,
  addonSdk,
  title = "Video Effects Pro Registration",
  alt = "Buy Video Effects Pro"
) {
  // Open the popup
  const popup = window.open(url, "_blank");

  // Check if the popup was blocked
  //@ts-ignore
  if (
    !popup ||
    popup.closed ||
    typeof popup.closed === "undefined" ||
    //@ts-ignore
    popup.focus === "undefined"
  ) {
    // const dialogResult =  addonSdk.app.showModalDialog({
    //   variant: "input",
    //   title: "Title Pro Registration",
    //   //@ts-ignore
    //   description:  <span>It seems the popup was blocked by your browser. Please visit <a href="https://uxplugins.com" target="_blank">https://uxplugins.com</a> directly.</span>
    //     ,
    // });
    // Handle the popup blocked scenario here
  } else {
    popup.focus();
  }
}

// a and b are javascript Date objects
export function dateDiffInDays(a, b) {
  // Discard the time and time-zone information.
  const _MS_PER_DAY = 1000 * 60 * 60 * 24;
  const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

// Function to adjust mesh scale based on texture dimensions
export const adjustMeshScale = (tex, containerWidth, containerHeight) => {
  const containerAspect = containerWidth / containerHeight;
  let imageAspect;

  if (tex.image instanceof HTMLVideoElement) {
    imageAspect = tex.image.videoWidth / tex.image.videoHeight;
  } else {
    imageAspect = tex.image.width / tex.image.height;
  }

  let scaleX = 2;
  let scaleY = 2;

  if (imageAspect > containerAspect) {
    // Image is wider than container
    scaleY = scaleX / imageAspect;
  } else {
    // Image is taller than container
    scaleX = scaleY * imageAspect;
  }

  return { x: scaleX, y: scaleY };
};
