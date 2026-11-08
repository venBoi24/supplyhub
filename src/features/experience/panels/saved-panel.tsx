"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Bell, Heart, TrendingDown } from "lucide-react";

import type { ProductListing } from "@/features/catalog/types";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";
import { formatCents } from "../types";

export function SavedPanel({ products }: { products: ProductListing[] }) {
  const { state, checkWatch, toggleWishlist } = useExperience();

  // Compare live catalog prices/stock against saved snapshots whenever this
  // surface renders or the persisted wishlist arrives, raising price-drop and
  // back-in-stock alerts.
  useEffect(() => {
    checkWatch(
      products.map((p) => ({
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        inventory: p.inventory,
        image: p.image.src,
        currency: p.currency,
      })),
    );
  }, [products, checkWatch, state.wishlist]);

  const saved = products.filter((p) => state.wishlist.includes(p.slug));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Heart className="size-5 text-accent" /> Your wishlist
            <span className="text-sm font-normal text-muted-foreground">({saved.length})</span>
          </h2>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0f766e]/30 bg-[#0f766e]/10 px-3 py-1 text-[0.6875rem] font-semibold text-[#0f766e]">
            <Bell className="size-3.5" /> Watching prices &amp; stock
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Save a piece from its product page. We&apos;ll alert you when the price drops or it comes
          back in stock.
        </p>

        {saved.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center">
            <Heart className="mx-auto size-7 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Nothing saved yet. Tap the heart on any product to start watching it.
            </p>
            <Link
              href="/products"
              className="mt-3 inline-block rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white"
            >
              Browse the catalog
            </Link>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {saved.map((p) => {
              const snap = state.watch[p.slug];
              const dropped = snap && p.priceCents < snap.priceCents;
              const restocked = snap && snap.inventory === 0 && p.inventory > 0;
              return (
                <li
                  key={p.slug}
                  className="relative flex gap-3 rounded-xl border border-border bg-surface p-3"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image.src}
                    alt={p.image.alt}
                    className="size-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${p.slug}`}
                      className="block truncate text-sm font-semibold hover:text-accent"
                    >
                      {p.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">{p.vendor.name}</p>
                    <p className="mt-1 text-sm font-semibold text-[#0f766e]">
                      {formatCents(p.priceCents, p.currency)}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 text-xs",
                        p.inventory > 0 ? "text-muted-foreground" : "text-[#b45309]",
                      )}
                    >
                      {p.inventory > 0 ? `${p.inventory} in stock` : "Out of stock"}
                    </p>
                    {dropped ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#0f766e]/10 px-2 py-0.5 text-[0.625rem] font-semibold text-[#0f766e]">
                        <TrendingDown className="size-3" /> Price dropped
                      </span>
                    ) : null}
                    {restocked ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[0.625rem] font-semibold text-accent">
                        <Bell className="size-3" /> Back in stock
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${p.name} from wishlist`}
                    onClick={() =>
                      toggleWishlist({
                        slug: p.slug,
                        name: p.name,
                        priceCents: p.priceCents,
                        inventory: p.inventory,
                        image: p.image.src,
                        currency: p.currency,
                      })
                    }
                    className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-surface/90 text-accent transition hover:bg-surface"
                  >
                    <Heart className="size-4 fill-accent" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
