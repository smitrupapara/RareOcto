"use client";

import Image from "next/image";
import { CldUploadWidget } from "next-cloudinary";
import { ArrowDown, ArrowUp, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cloudinaryLoader } from "@/lib/cloudinary/loader";

type ImageUploaderProps = {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
};

type UploadResultInfo = {
  public_id?: string;
};

type UploadResult = {
  event?: string;
  info?: UploadResultInfo | string;
};

const ADMIN_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_ADMIN_UPLOAD_PRESET;

export function ImageUploader({ value, onChange, max = 20 }: ImageUploaderProps) {
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = value.slice();
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    onChange(next);
  }

  function remove(index: number) {
    const next = value.slice();
    next.splice(index, 1);
    onChange(next);
  }

  function handleSuccess(result: UploadResult) {
    if (result.event !== "success") return;
    const info = result.info;
    const publicId =
      typeof info === "object" && info && "public_id" in info
        ? info.public_id
        : null;
    if (!publicId) return;
    if (value.includes(publicId)) return;
    if (value.length >= max) return;
    onChange([...value, publicId]);
  }

  if (!ADMIN_PRESET) {
    return (
      <div className="rounded-lg border border-dashed border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive">
        <p className="font-medium">Cloudinary upload preset is not configured.</p>
        <p className="mt-1 text-xs">
          Set <code>NEXT_PUBLIC_CLOUDINARY_ADMIN_UPLOAD_PRESET</code> in
          <code> .env.local</code> and restart the dev server.
        </p>
      </div>
    );
  }

  const atMax = value.length >= max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {value.length} / {max} image{value.length === 1 ? "" : "s"}
        </p>
        <CldUploadWidget
          uploadPreset={ADMIN_PRESET}
          options={{
            multiple: true,
            sources: ["local", "url", "camera"],
            maxFiles: max - value.length,
            clientAllowedFormats: ["jpg", "jpeg", "png", "webp", "avif"],
          }}
          onSuccess={(result) => handleSuccess(result as UploadResult)}
        >
          {({ open }) => (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => open?.()}
              disabled={atMax}
            >
              <Upload className="size-4" />
              Upload images
            </Button>
          )}
        </CldUploadWidget>
      </div>

      {value.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No images yet. Upload at least one to publish this product.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((publicId, index) => (
            <li
              key={publicId}
              className="group relative overflow-hidden rounded-xl border border-border bg-muted"
            >
              <div className="relative aspect-square w-full">
                <Image
                  loader={cloudinaryLoader}
                  src={publicId}
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-foreground shadow">
                {String(index + 1).padStart(2, "0")}
                {index === 0 ? " · cover" : ""}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-border bg-background/95 px-2 py-1.5">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move left"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    className="rounded-md p-1 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5 -rotate-90" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move right"
                    disabled={index === value.length - 1}
                    onClick={() => move(index, 1)}
                    className="rounded-md p-1 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5 -rotate-90" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => remove(index)}
                  className="rounded-md p-1 text-destructive transition hover:bg-destructive/10"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
