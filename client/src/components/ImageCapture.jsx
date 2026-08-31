import { useEffect, useRef, useState } from "react";
import { Button } from "./ui";

/** Photo picker.
 *
 *  A plain file input with capture="environment" opens the rear camera
 *  directly on mobile and the file browser on desktop - which is the entire
 *  job react-dropzone and react-webcam were carrying two dependencies for.
 *
 *  The old ImageUploader also rendered the preview twice and had its upload
 *  button commented out, making the file-input branch unreachable. */
export default function ImageCapture({ file, onChange, disabled, label = "Photo" }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-content">{label}</span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="space-y-2">
          <img
            src={preview}
            alt="Selected photo preview"
            className="aspect-[4/3] w-full rounded-xl border border-line object-cover"
          />
          <div className="flex gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={disabled}
                    onClick={() => inputRef.current?.click()}>
              Retake
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={disabled}
                    onClick={() => { onChange(null); if (inputRef.current) inputRef.current.value = ""; }}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line text-content-muted transition-colors hover:border-brand-400 hover:text-brand-700 disabled:opacity-50"
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <path d="M3 9a2 2 0 0 1 2-2h2l1.5-2h7L17 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          <span className="text-sm font-medium">Take or choose a photo</span>
        </button>
      )}
    </div>
  );
}
