"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePathname, useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { submitReviewAction } from "@/app/(public)/catalog/[slug]/actions";

const schema = z.object({
  rating: z.number().int().min(1, "Pick a star rating").max(5),
  title: z
    .string()
    .trim()
    .max(120, "Keep the title under 120 characters")
    .optional(),
  body: z
    .string()
    .trim()
    .max(2000, "Reviews are capped at 2000 characters")
    .optional(),
});

type FormValues = z.infer<typeof schema>;

type ReviewFormProps = {
  productId: string;
  isAuthed: boolean;
};

export function ReviewForm({ productId, isAuthed }: ReviewFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [serverError, setServerError] = useState("");
  const [success, setSuccess] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rating: 0, title: "", body: "" },
  });

  const rating = form.watch("rating");

  function gateOrSubmit(values: FormValues) {
    if (!isAuthed) {
      const target = pathname ?? "/";
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    setServerError("");
    setSuccess(false);
    startTransition(async () => {
      const result = await submitReviewAction({
        productId,
        rating: values.rating,
        title: values.title?.trim() ? values.title : null,
        body: values.body?.trim() ? values.body : null,
      });
      if (!result.ok) {
        setServerError(result.error);
        return;
      }
      setSuccess(true);
      form.reset({ rating: 0, title: "", body: "" });
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(gateOrSubmit)}
      className="rounded-2xl border border-border bg-card/40 p-5"
      noValidate
    >
      <h3 className="font-display text-lg font-semibold tracking-tight">
        Write a review
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell other walls what to expect.
      </p>

      <div className="mt-4">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Rating
        </span>
        <div
          className="mt-2 flex items-center gap-1"
          role="radiogroup"
          aria-label="Rating"
          onMouseLeave={() => setHoverRating(0)}
        >
          {[1, 2, 3, 4, 5].map((n) => {
            const active = (hoverRating || rating) >= n;
            return (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? "" : "s"}`}
                onMouseEnter={() => setHoverRating(n)}
                onFocus={() => setHoverRating(n)}
                onBlur={() => setHoverRating(0)}
                onClick={() =>
                  form.setValue("rating", n, { shouldValidate: true })
                }
                className="rounded-full p-1 outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Star
                  className={cn(
                    "size-7 transition",
                    active
                      ? "fill-[var(--marigold)] text-[var(--marigold)]"
                      : "text-foreground/30",
                  )}
                />
              </button>
            );
          })}
        </div>
        {form.formState.errors.rating ? (
          <p className="mt-1.5 text-xs text-destructive">
            {form.formState.errors.rating.message}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-title"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Title (optional)
        </label>
        <input
          id="review-title"
          {...form.register("title")}
          maxLength={120}
          placeholder="A short headline"
          className="mt-1.5 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {form.formState.errors.title ? (
          <p className="mt-1.5 text-xs text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label
          htmlFor="review-body"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          Review (optional)
        </label>
        <textarea
          id="review-body"
          {...form.register("body")}
          rows={4}
          maxLength={2000}
          placeholder="How it looks on your wall, how easy it was to install…"
          className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {form.formState.errors.body ? (
          <p className="mt-1.5 text-xs text-destructive">
            {form.formState.errors.body.message}
          </p>
        ) : null}
      </div>

      {serverError ? (
        <p className="mt-3 text-xs text-destructive">{serverError}</p>
      ) : null}
      {success ? (
        <p className="mt-3 text-xs text-[var(--sea)]">
          Thanks — your review is live.
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-5 w-full sm:w-auto"
        size="lg"
        disabled={isPending}
      >
        {isPending
          ? "Posting…"
          : isAuthed
            ? "Post review"
            : "Sign in to review"}
      </Button>
    </form>
  );
}
