import type { CSSProperties } from "react";
import type { ImageCrop } from "./types";

export const DEFAULT_IMAGE_CROP: ImageCrop = {
  x: 50,
  y: 50,
  zoom: 100,
  fit: "cover",
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeImageCrop(
  value?: Partial<ImageCrop> | null,
): ImageCrop {
  return {
    x: clamp(Number(value?.x ?? 50), 0, 100),
    y: clamp(Number(value?.y ?? 50), 0, 100),
    zoom: clamp(Number(value?.zoom ?? 100), 100, 200),
    fit: value?.fit === "contain" ? "contain" : "cover",
  };
}

export type ImageCropStyle = CSSProperties & {
  "--image-x": string;
  "--image-y": string;
  "--image-scale": number;
  "--image-fit": ImageCrop["fit"];
  "--image-transform": string;
};

export function imageCropStyle(
  value?: Partial<ImageCrop> | null,
): ImageCropStyle {
  const crop = normalizeImageCrop(value);
  return {
    "--image-x": `${crop.x}%`,
    "--image-y": `${crop.y}%`,
    "--image-scale": crop.zoom / 100,
    "--image-fit": crop.fit,
    "--image-transform": crop.zoom === 100 ? "none" : `scale(${crop.zoom / 100})`,
  };
}
