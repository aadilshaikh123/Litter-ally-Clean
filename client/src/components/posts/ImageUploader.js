import React, { useState, useRef, useCallback } from "react";
import { useDropzone } from 'react-dropzone';
import Webcam from "react-webcam";

const ImageUploader = ({ onImageUpload, initialPreview }) => {
  const [preview, setPreview] = useState(initialPreview || null);
  const [mode, setMode] = useState(null);
  const webcamRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onImageUpload(file, reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file.");
    }
  }, [onImageUpload]);

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (imageSrc) {
      setPreview(imageSrc);
      const file = dataURLtoFile(imageSrc, 'capturedImage.jpeg');
      onImageUpload(file, imageSrc);
    }
  }, [webcamRef, onImageUpload]);

  // ... (rest of your existing code)
  const dataURLtoFile = (dataurl, filename) => {
    let arr = dataurl.split(','),
        mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]),
        n = bstr.length,
        u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  const clearPhoto = () => {
    setPreview(null);
    setMode(null); // Reset mode when clearing photo
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        onImageUpload(file, reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      alert("Please select a valid image file.");
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 font-semibold">Upload or Take a Photo:</label>

      {/* Drag-and-Drop Area */}
      <div {...getRootProps()} className="dropzone border-dashed border-2 border-gray-400 p-4 mb-4">
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded shadow-lg mb-2" />
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-3">
        {/* <button
          type="button"
          onClick={() => setMode("upload")}
          className={`px-4 py-2 rounded ${mode === "upload" ? "bg-blue-600 text-white" : "bg-gray-300 hover:bg-gray-400"}`}
        >
          Upload Image
        </button> */}

        <button
          type="button"
          onClick={() => setMode("camera")}
          className={`px-4 py-2 rounded ${mode === "camera" ? "bg-green-600 text-white" : "bg-gray-300 hover:bg-gray-400"}`}
        >
          Take Photo
        </button>
      </div>
      {/* ... (rest of your existing buttons for camera and upload mode) */}
      {mode === "upload" && (
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="w-full border p-2 rounded cursor-pointer mb-2"
        />
      )}

      {mode === "camera" && (
        <div className="camera-container mb-2">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full h-48 rounded shadow-lg"
          />
          <button
            onClick={capture}
            className="bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 mt-2"
          >
            Capture Photo
          </button>
        </div>
      )}

      {/* Clear Photo Button */}
      {preview && (
        <div>
          <img src={preview} alt="Captured or Uploaded" className="w-full h-48 object-cover rounded shadow-lg mb-2" />
          <button
            type="button"
            onClick={clearPhoto}
            className="bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600"
          >
            Clear Photo
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
