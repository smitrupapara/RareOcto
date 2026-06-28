"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ShareButtonProps = {
  url: string;
  title: string;
  text?: string;
  className?: string;
  size?: "default" | "icon" | "icon-sm";
  showLabel?: boolean;
};

export function ShareButton({
  url,
  title,
  text,
  className,
  size = "default",
  showLabel = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    // Native share sheet (mobile / supporting browsers).
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (err) {
        // AbortError = user dismissed the sheet; nothing to do.
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Any other failure falls through to the clipboard path below.
      }
    }

    // Desktop fallback: copy the link and show a transient confirmation.
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context / permissions) — last-resort prompt.
      window.prompt("Copy this link", url);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={showLabel ? "default" : size}
      onClick={handleShare}
      aria-label={copied ? "Link copied" : "Share this piece"}
      className={cn("rounded-full", className)}
    >
      {copied ? (
        <Check className="text-[var(--coral)]" />
      ) : (
        <Share2 className="text-foreground" />
      )}
      {showLabel ? <span>{copied ? "Copied" : "Share"}</span> : null}
    </Button>
  );
}
