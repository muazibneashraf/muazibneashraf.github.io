/* eslint-disable @next/next/no-img-element */
import type { ImgHTMLAttributes } from "react";
import { imageCropStyle } from "@/lib/image-crop";
import type { ImageCrop } from "@/lib/types";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "style" | "alt"> & {
  alt: string;
  crop?: Partial<ImageCrop> | null;
};

export function CroppedImage({ crop, className = "", alt, ...props }: Props) {
  return (
    <img
      decoding="async"
      {...props}
      alt={alt}
      className={`managed-image ${className}`.trim()}
      style={imageCropStyle(crop)}
    />
  );
}
