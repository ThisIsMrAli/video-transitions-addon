import { useAtom } from "jotai";
import React, { useRef, useState, DragEvent } from "react";
import { layersAtom } from "../../../store/general";
import { convertFileToBase64 } from "./../../../helpers/utils";
import { ToastQueue } from "@react-spectrum/toast";
// Import the upload icon

const FileInput = () => {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [layers, setLayers] = useAtom(layersAtom);

  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size <= 200 * 1024 * 1024) {
        // 200MB in bytes

        if (file) {
          const url = URL.createObjectURL(file);

          const video = document.createElement("video");
          video.src = url;
          video.onloadedmetadata = () => {
            setLayers([
              ...layers,
              {
                assetType: "media",
                file: url,
                type: file.type,
                name: file.name,
                start: 0,
                end: video.duration,
              },
            ]);
            // onTrimChange(position, { start: 0, end: video.duration });
          };
        }
      } else {
        ToastQueue.negative("File size exceeds 200MB limit", { timeout: 3000 });
      }
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    const allowedTypes = ["image/png", "image/jpeg", "video/mp4", "video/webm"];
    if (file && allowedTypes.includes(file.type)) {
      if (file.size <= 200 * 1024 * 1024) {
        // 200MB in bytes
        //setMedia({ file, fileUrl: await convertFileToBase64(file) });
      } else {
        ToastQueue.negative("File size exceeds 200MB limit", { timeout: 3000 });
      }
    } else {
      ToastQueue.negative("Unsupported file type", { timeout: 3000 });
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  return (
    <div
      ref={ref}
      onClick={openFileDialog}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`cursor-pointer bg-[#f8f8f8] overflow-hidden flex flex-col justify-center items-center w-[150px] h-[150px] group rounded-[8px] outline outline-2 outline-[#EBEBEB] 
        ${
          isDragging
            ? "bg-gray-200 outline-borderHover"
            : "hover:outline-borderHover"
        }`}
    >
      <input
        ref={inputRef}
        className="hidden"
        onChange={handleFileChange}
        type="file"
        id="avatar"
        name="avatar"
        accept=".mp4,.webm"
        max="209715200" // 200MB in bytes
      />
      <img
        src={"./icons/upload.png"}
        alt="Upload"
        className="w-[40px] mt-[-10px]"
      />
      <span
        className={`chooseImage text-[14px] text-[#242424] group-hover:text-borderHover font-bold`}
      >
        Add Video
      </span>
      <span className="font-normal text-[11px]">
        Supported formats: MP4, WebM
      </span>
      <span className="font-normal text-[11px]">Maximum file size: 200MB</span>
    </div>
  );
};

export default FileInput;
