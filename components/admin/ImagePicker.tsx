"use client";

import { useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import {
  DEFAULT_IMAGE_CROP,
  imageCropStyle,
  normalizeImageCrop,
} from "@/lib/image-crop";
import type { ImageCrop } from "@/lib/types";

const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
const MAX_DIMENSION = 1600;
const TARGET_OUTPUT_BYTES = 600 * 1024;

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close(),
      };
    } catch {
      // Some browsers expose createImageBitmap but cannot decode every format it advertises.
    }
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(new Error("This browser cannot decode the selected image."));
      image.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(blob);
  });
}

async function compressImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > MAX_SOURCE_BYTES)
    throw new Error("Choose an image smaller than 30 MB.");

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height)
      throw new Error("The selected image has invalid dimensions.");

    const initialScale = Math.min(
      1,
      MAX_DIMENSION / Math.max(decoded.width, decoded.height),
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("This browser could not process the image.");

    let bestBlob: Blob | null = null;
    for (const sizeFactor of [1, 0.88, 0.76, 0.66]) {
      const width = Math.max(
        1,
        Math.round(decoded.width * initialScale * sizeFactor),
      );
      const height = Math.max(
        1,
        Math.round(decoded.height * initialScale * sizeFactor),
      );
      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(decoded.source, 0, 0, width, height);

      for (const quality of [0.82, 0.72, 0.62, 0.52]) {
        const webpBlob = await canvasToBlob(canvas, "image/webp", quality);
        const blob =
          webpBlob?.type === "image/webp"
            ? webpBlob
            : await canvasToBlob(canvas, "image/jpeg", quality);
        if (!blob) continue;
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
        if (blob.size <= TARGET_OUTPUT_BYTES) return await blobToDataUrl(blob);
      }
    }

    if (!bestBlob) throw new Error("Image compression failed.");
    return await blobToDataUrl(bestBlob);
  } finally {
    decoded.cleanup();
  }
}

function CropEditor({
  label,
  src,
  crop: cropValue,
  previewAspect,
  onChange,
}: {
  label: string;
  src: string;
  crop?: ImageCrop;
  previewAspect: string;
  onChange: (crop: ImageCrop) => void;
}) {
  const crop = normalizeImageCrop(cropValue);
  const drag = useRef<{
    clientX: number;
    clientY: number;
    x: number;
    y: number;
  } | null>(null);

  function patch(next: Partial<ImageCrop>) {
    onChange(normalizeImageCrop({ ...crop, ...next }));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      x: crop.x,
      y: crop.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    patch({
      x:
        drag.current.x -
        ((event.clientX - drag.current.clientX) / bounds.width) * 100,
      y:
        drag.current.y -
        ((event.clientY - drag.current.clientY) / bounds.height) * 100,
    });
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="image-crop-editor">
      <div
        className="image-picker-preview"
        style={{ aspectRatio: previewAspect }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={`${label} crop preview`}
          style={imageCropStyle(crop)}
        />
        <span>Drag image to reposition</span>
      </div>
      <div className="crop-toolbar">
        <div className="crop-mode" aria-label={`${label} frame mode`}>
          <button
            type="button"
            aria-pressed={crop.fit === "cover"}
            onClick={() => patch({ fit: "cover" })}
          >
            Fill frame
          </button>
          <button
            type="button"
            aria-pressed={crop.fit === "contain"}
            onClick={() => patch({ fit: "contain" })}
          >
            Show full image
          </button>
        </div>
        <button
          type="button"
          className="crop-reset"
          onClick={() => onChange({ ...DEFAULT_IMAGE_CROP })}
        >
          Reset framing
        </button>
      </div>
      <div className="crop-sliders">
        <label>
          <span>
            Horizontal <output>{Math.round(crop.x)}%</output>
          </span>
          <input
            aria-label={`${label} horizontal position`}
            type="range"
            min="0"
            max="100"
            value={crop.x}
            onChange={(event) => patch({ x: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>
            Vertical <output>{Math.round(crop.y)}%</output>
          </span>
          <input
            aria-label={`${label} vertical position`}
            type="range"
            min="0"
            max="100"
            value={crop.y}
            onChange={(event) => patch({ y: Number(event.target.value) })}
          />
        </label>
        <label>
          <span>
            Zoom <output>{Math.round(crop.zoom)}%</output>
          </span>
          <input
            aria-label={`${label} zoom`}
            type="range"
            min="100"
            max="200"
            value={crop.zoom}
            onChange={(event) => patch({ zoom: Number(event.target.value) })}
          />
        </label>
      </div>
    </div>
  );
}

export function ImagePicker({
  label,
  value,
  crop,
  previewAspect = "16 / 9",
  onChange,
}: {
  label: string;
  value: string;
  crop?: ImageCrop;
  previewAspect?: string;
  onChange: (value: string, crop: ImageCrop) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const image = await compressImage(file);
      onChange(image, { ...DEFAULT_IMAGE_CROP });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Image upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-field image-picker">
      <span>{label}</span>
      <div className="image-picker-input">
        <input
          aria-label={`${label} URL`}
          value={value.startsWith("data:") ? "Local image selected" : value}
          onChange={(event) =>
            onChange(event.target.value, normalizeImageCrop(crop))
          }
          disabled={value.startsWith("data:")}
          placeholder="Paste an image URL or browse your computer"
        />
        <input
          ref={inputRef}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={choose}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? "Processing…" : "Browse"}
        </button>
        {value && (
          <button
            type="button"
            className="quiet"
            onClick={() => onChange("", { ...DEFAULT_IMAGE_CROP })}
          >
            Clear
          </button>
        )}
      </div>
      <small>
        JPG, PNG, WebP, GIF, or AVIF up to 30 MB. Images are optimized
        automatically.
      </small>
      {error && (
        <small className="image-error" role="alert">
          {error}
        </small>
      )}
      {value && (
        <CropEditor
          label={label}
          src={value}
          crop={crop}
          previewAspect={previewAspect}
          onChange={(nextCrop) => onChange(value, nextCrop)}
        />
      )}
    </div>
  );
}

export function GalleryPicker({
  value,
  crops = [],
  onChange,
}: {
  value: string[];
  crops?: ImageCrop[];
  onChange: (value: string[], crops: ImageCrop[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeIndex = Math.max(0, Math.min(selectedIndex, value.length - 1));
  const normalizedCrops = value.map((_, index) =>
    normalizeImageCrop(crops[index]),
  );

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const images = await Promise.all(files.map(compressImage));
      const nextIndex = value.length;
      onChange(
        [...value, ...images],
        [...normalizedCrops, ...images.map(() => ({ ...DEFAULT_IMAGE_CROP }))],
      );
      setSelectedIndex(nextIndex);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Gallery upload failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function remove(index: number) {
    onChange(
      value.filter((_, itemIndex) => itemIndex !== index),
      normalizedCrops.filter((_, itemIndex) => itemIndex !== index),
    );
    setSelectedIndex(Math.max(0, Math.min(index, value.length - 2)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= value.length) return;
    const nextImages = [...value];
    const nextCrops = [...normalizedCrops];
    [nextImages[index], nextImages[target]] = [
      nextImages[target],
      nextImages[index],
    ];
    [nextCrops[index], nextCrops[target]] = [
      nextCrops[target],
      nextCrops[index],
    ];
    onChange(nextImages, nextCrops);
    setSelectedIndex(target);
  }

  function updateCrop(index: number, crop: ImageCrop) {
    const nextCrops = [...normalizedCrops];
    nextCrops[index] = crop;
    onChange(value, nextCrops);
  }

  function updateUrls(raw: string) {
    const localEntries = value
      .map((image, index) => ({ image, crop: normalizedCrops[index] }))
      .filter((item) => item.image.startsWith("data:"));
    const urls = raw
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
    const urlEntries = urls.map((image) => {
      const oldIndex = value.indexOf(image);
      return {
        image,
        crop:
          oldIndex >= 0 ? normalizedCrops[oldIndex] : { ...DEFAULT_IMAGE_CROP },
      };
    });
    const entries = [...localEntries, ...urlEntries];
    onChange(
      entries.map((item) => item.image),
      entries.map((item) => item.crop),
    );
  }

  return (
    <div className="admin-field gallery-picker">
      <span>Gallery images</span>
      <small>
        Select an image to frame it. Use the arrow buttons to change the gallery
        order.
      </small>
      <div className="gallery-picker-grid">
        {value.map((image, index) => (
          <div
            className={safeIndex === index ? "selected" : ""}
            key={`${image.slice(0, 40)}-${index}`}
          >
            <button
              type="button"
              className="gallery-select"
              aria-label={`Edit gallery image ${index + 1}`}
              onClick={() => setSelectedIndex(index)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`Gallery item ${index + 1}`}
                style={imageCropStyle(normalizedCrops[index])}
              />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </button>
            <div className="gallery-item-actions">
              <button
                type="button"
                aria-label={`Move gallery image ${index + 1} left`}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              >
                ←
              </button>
              <button
                type="button"
                aria-label={`Move gallery image ${index + 1} right`}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
              >
                →
              </button>
              <button
                type="button"
                aria-label={`Remove gallery image ${index + 1}`}
                onClick={() => remove(index)}
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="gallery-add"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {busy ? (
            "Processing…"
          ) : (
            <>
              ＋<small>Add photos</small>
            </>
          )}
        </button>
      </div>
      <input
        ref={inputRef}
        hidden
        multiple
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={choose}
      />
      {value.length > 0 && (
        <CropEditor
          label={`Gallery image ${safeIndex + 1}`}
          src={value[safeIndex]}
          crop={normalizedCrops[safeIndex]}
          previewAspect="16 / 10"
          onChange={(crop) => updateCrop(safeIndex, crop)}
        />
      )}
      <textarea
        aria-label="Gallery image URLs"
        value={value.filter((item) => !item.startsWith("data:")).join("\n")}
        placeholder="Or paste image URLs, one per line"
        onChange={(event) => updateUrls(event.target.value)}
      />
      {error && (
        <small className="image-error" role="alert">
          {error}
        </small>
      )}
    </div>
  );
}
