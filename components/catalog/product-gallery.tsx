"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";

type ProductGalleryProps = {
  images: string[];
  alt: string;
  className?: string;
};

export function ProductGallery({ images, alt, className }: ProductGalleryProps) {
  const safeImages = images.length > 0 ? images : [""];
  const [active, setActive] = useState(0);
  const current = safeImages[active] ?? "";

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border bg-muted">
        {current ? (
          <Image
            loader={cloudinaryLoader}
            src={current}
            alt={alt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
            no image
          </div>
        )}
      </div>

      {safeImages.length > 1 ? (
        <ul
          role="tablist"
          aria-label="Product images"
          className="grid grid-cols-5 gap-2 sm:grid-cols-6"
        >
          {safeImages.map((id, i) => (
            <li key={`${id}-${i}`}>
              <button
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={`Show image ${i + 1}`}
                onClick={() => setActive(i)}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-xl border bg-muted transition",
                  i === active
                    ? "border-coral ring-2 ring-coral/40"
                    : "border-border hover:border-foreground/40",
                )}
              >
                {id ? (
                  <Image
                    loader={cloudinaryLoader}
                    src={id}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
