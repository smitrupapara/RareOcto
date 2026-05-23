"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toggleFavoriteAction } from "@/app/(public)/catalog/[slug]/actions";

type FavoriteToggleProps = {
  productId: string;
  isAuthed: boolean;
  initialIsFavorite: boolean;
  className?: string;
  size?: "default" | "icon" | "icon-sm";
  showLabel?: boolean;
};

export function FavoriteToggle({
  productId,
  isAuthed,
  initialIsFavorite,
  className,
  size = "icon",
  showLabel = false,
}: FavoriteToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [optimisticFav, setOptimisticFav] = useOptimistic(
    initialIsFavorite,
    (_state, next: boolean) => next,
  );

  function handleClick() {
    if (!isAuthed) {
      const target = pathname ?? "/";
      router.push(`/login?next=${encodeURIComponent(target)}`);
      return;
    }
    const next = !optimisticFav;
    startTransition(async () => {
      setOptimisticFav(next);
      const result = await toggleFavoriteAction(productId);
      if (!result.ok) {
        setOptimisticFav(!next);
      }
    });
  }

  const label = optimisticFav ? "Remove from favorites" : "Add to favorites";

  return (
    <Button
      type="button"
      variant={optimisticFav ? "secondary" : "outline"}
      size={showLabel ? "default" : size}
      onClick={handleClick}
      aria-pressed={optimisticFav}
      aria-label={label}
      className={cn("rounded-full", className)}
    >
      <Heart
        className={cn(
          "transition",
          optimisticFav ? "fill-[var(--coral)] text-[var(--coral)]" : "text-foreground",
        )}
      />
      {showLabel ? (
        <span>{optimisticFav ? "Saved" : "Save"}</span>
      ) : null}
    </Button>
  );
}
