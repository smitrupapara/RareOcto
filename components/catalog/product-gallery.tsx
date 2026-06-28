"use client";

import Image from "next/image";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";
import { blurUrl } from "@/lib/cloudinary/transforms";

type ProductGalleryProps = {
  images: string[];
  alt: string;
  className?: string;
};

export function ProductGallery({ images, alt, className }: ProductGalleryProps) {
  const safeImages = images.length > 0 ? images : [""];
  const [active, setActive] = useState(0);
  const current = safeImages[active] ?? "";
  const currentBlur = current ? blurUrl(current) : undefined;

  // Remember which src has finished loading and derive `loaded` from it, so the
  // moment the selection changes `loaded` is false again — no effect needed.
  // While the newly-picked image decodes we show a spinner + blur preview;
  // otherwise switching thumbnails would leave the previous image on screen
  // until the new one arrives (Next only paints the blur placeholder on first
  // mount, so the `key={current}` below also forces a fresh blur per selection).
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const loaded = loadedSrc === current;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {current ? (
          <>
            <Image
              key={current}
              loader={cloudinaryLoader}
              src={current}
              alt={alt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              priority
              placeholder={currentBlur ? "blur" : "empty"}
              blurDataURL={currentBlur}
              onLoad={() => setLoadedSrc(current)}
              onError={() => setLoadedSrc(current)}
              className="object-cover"
            />
            {!loaded ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-muted/30 backdrop-blur-sm">
                <Loader2 className="size-7 animate-spin text-muted-foreground" />
              </div>
            ) : null}
          </>
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
                  "relative aspect-square w-full overflow-hidden rounded-md border bg-muted transition",
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
                    placeholder={blurUrl(id) ? "blur" : "empty"}
                    blurDataURL={blurUrl(id)}
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
