import { Star } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReviewAggregate } from "@/lib/catalog/queries";

type ReviewSummaryProps = {
  aggregate: ReviewAggregate;
  size?: "sm" | "lg";
  className?: string;
};

function Stars({ value, sizePx }: { value: number; sizePx: number }) {
  return (
    <div
      className="relative inline-flex"
      role="img"
      aria-label={`${value.toFixed(1)} out of 5 stars`}
    >
      <div className="flex text-foreground/20">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} style={{ width: sizePx, height: sizePx }} aria-hidden />
        ))}
      </div>
      <div
        className="absolute inset-0 flex overflow-hidden text-[var(--marigold)]"
        style={{ width: `${(Math.min(5, Math.max(0, value)) / 5) * 100}%` }}
        aria-hidden
      >
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            fill="currentColor"
            style={{ width: sizePx, height: sizePx }}
          />
        ))}
      </div>
    </div>
  );
}

export function ReviewSummary({
  aggregate,
  size = "sm",
  className,
}: ReviewSummaryProps) {
  const { average, count } = aggregate;
  const px = size === "lg" ? 20 : 16;

  if (count === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Stars value={0} sizePx={px} />
        <span>No reviews yet</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Stars value={average} sizePx={px} />
      <span className={cn("font-medium", size === "lg" ? "text-base" : "text-sm")}>
        {average.toFixed(1)}
      </span>
      <a
        href="#reviews"
        className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        ({count} {count === 1 ? "review" : "reviews"})
      </a>
    </div>
  );
}

export { Stars };
