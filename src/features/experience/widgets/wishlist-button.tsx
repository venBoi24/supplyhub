"use client";

import { Heart } from "lucide-react";

import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import type { WatchSnapshot } from "../types";

export function WishlistButton({ item, className }: { item: WatchSnapshot; className?: string }) {
  const { state, toggleWishlist } = useExperience();
  const saved = state.wishlist.includes(item.slug);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${item.name} from wishlist` : `Save ${item.name} to wishlist`}
      title={saved ? "Saved · watching price & stock" : "Save & watch price"}
      onClick={() => toggleWishlist(item)}
      className={cn(
        "pointer-events-auto grid size-9 place-items-center rounded-full border border-border bg-surface/90 text-muted-foreground shadow-sm backdrop-blur transition hover:scale-105 hover:text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        saved && "border-accent/40 text-accent",
        className,
      )}
    >
      <Heart className={cn("size-4 transition", saved && "fill-accent")} aria-hidden="true" />
    </button>
  );
}
