import { BadgeCheck } from "lucide-react";

import { Stars } from "@/components/catalog/review-summary";
import { getReviewsForProduct } from "@/lib/catalog/queries";

type ReviewListProps = {
  productId: string;
  page?: number;
  pageSize?: number;
};

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export async function ReviewList({ productId, page = 1, pageSize = 10 }: ReviewListProps) {
  const { reviews, total } = await getReviewsForProduct(productId, { page, pageSize });

  if (total === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
        No reviews yet — be the first to share how it looks on your wall.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {reviews.map((r) => (
        <li key={r.id} className="py-6">
          <div className="flex flex-wrap items-center gap-3">
            <Stars value={r.rating} sizePx={16} />
            {r.title ? (
              <p className="font-display text-base font-semibold tracking-tight">
                {r.title}
              </p>
            ) : null}
            {r.verified_purchase ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sea)]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--sea)]">
                <BadgeCheck className="size-3" /> Verified
              </span>
            ) : null}
          </div>
          {r.body ? (
            <p className="mt-2 whitespace-pre-line text-pretty text-sm leading-relaxed text-foreground/85">
              {r.body}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {dateFmt.format(new Date(r.created_at))}
          </p>
        </li>
      ))}
    </ul>
  );
}
