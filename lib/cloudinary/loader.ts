import type { ImageLoader, ImageLoaderProps } from "next/image";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

export const cloudinaryLoader: ImageLoader = ({
  src,
  width,
  quality,
}: ImageLoaderProps) => {
  if (!cloudName) return src;

  const params = [
    "f_auto",
    "c_limit",
    `w_${width}`,
    `q_${quality ?? "auto"}`,
  ].join(",");

  const cleanSrc = src.startsWith("/") ? src.slice(1) : src;
  return `https://res.cloudinary.com/${cloudName}/image/upload/${params}/${cleanSrc}`;
};
