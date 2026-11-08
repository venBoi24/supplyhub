"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Camera, Star } from "lucide-react";

import type { ProductListing } from "@/features/catalog/types";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none";

export function ReviewsPanel({ products }: { products: ProductListing[] }) {
  const { state, submitReview } = useExperience();
  const [target, setTarget] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const nameBySlug = useMemo(() => new Map(products.map((p) => [p.slug, p.name])), [products]);

  // Only completed (confirmed-receipt) orders unlock a verified-purchase review.
  const reviewable = state.orders
    .filter((o) => o.status === "completed")
    .flatMap((o) =>
      o.items
        .filter((it) => !(state.reviews[it.slug] ?? []).some((r) => r.orderNumber === o.number))
        .map((it) => ({
          key: `${o.id}:${it.slug}`,
          slug: it.slug,
          orderNumber: o.number,
          name: it.name,
        })),
    );

  const allReviews = Object.entries(state.reviews).flatMap(([slug, list]) =>
    list.map((r) => ({ ...r, slug, productName: nameBySlug.get(slug) ?? slug })),
  );

  const breakdown = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: allReviews.filter((r) => r.rating === star).length,
  }));
  const totalReviews = allReviews.length;
  const avg = totalReviews
    ? (allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)
    : "—";

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const chosen = reviewable.find((r) => r.key === target);
    if (!chosen || !text.trim()) return;
    submitReview(chosen.slug, {
      orderNumber: chosen.orderNumber,
      rating,
      text: text.trim(),
      photo,
      author: "Verified buyer",
    });
    setTarget("");
    setText("");
    setPhoto(null);
    setRating(5);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-lg font-medium">Write a verified review</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Only buyers who confirmed receipt can review — keeps ratings honest.
        </p>
        {reviewable.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-muted p-3 text-sm text-muted-foreground">
            Confirm receipt on a delivered order to unlock reviewing.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            <select
              className={input}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Choose purchase to review"
            >
              <option value="">Choose a confirmed purchase…</option>
              {reviewable.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name} · {r.orderNumber}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={rating === s}
                  onClick={() => setRating(s)}
                  aria-label={`${s} star`}
                >
                  <Star
                    className={cn(
                      "size-6",
                      s <= rating ? "fill-[#fbbf24] text-[#fbbf24]" : "text-border-strong",
                    )}
                  />
                </button>
              ))}
            </div>
            <textarea
              className={input}
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="How was the piece and the delivery?"
              aria-label="Review text"
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <Camera className="size-4" /> Add a photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
            </label>
            {photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo}
                alt="Review attachment"
                className="size-20 rounded-lg object-cover"
              />
            ) : null}
            <button
              type="submit"
              disabled={!target || !text.trim()}
              className="w-full rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              Publish review
            </button>
          </div>
        )}
      </form>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-medium">Community reviews</h2>
          <span className="flex items-center gap-1 text-sm font-semibold">
            <Star className="size-4 fill-[#fbbf24] text-[#fbbf24]" /> {avg} · {totalReviews}
          </span>
        </div>
        <div className="mt-3 space-y-1">
          {breakdown.map((b) => (
            <div key={b.star} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-6">{b.star}★</span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full bg-[#fbbf24]"
                  style={{ width: totalReviews ? `${(b.count / totalReviews) * 100}%` : "0%" }}
                />
              </div>
              <span className="w-4 text-right">{b.count}</span>
            </div>
          ))}
        </div>
        {allReviews.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No reviews yet on this device.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {allReviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{r.productName}</p>
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} className="size-3 fill-[#fbbf24] text-[#fbbf24]" />
                    ))}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.author} · verified purchase {r.orderNumber}
                </p>
                <p className="mt-2 text-sm">{r.text}</p>
                {r.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.photo}
                    alt="Buyer photo"
                    className="mt-2 size-20 rounded-lg object-cover"
                  />
                ) : null}
                {r.sellerReply ? (
                  <p className="mt-2 rounded-lg bg-surface-muted p-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Studio reply:</span>{" "}
                    {r.sellerReply}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
