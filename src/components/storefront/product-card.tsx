"use client";

import Image from "next/image";
import Link from "next/link";

import type { ProductListing } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { WishlistButton } from "@/features/experience/widgets/wishlist-button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { AvailabilityBadge } from "./availability-badge";
import { MakerLabel } from "./maker-label";

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductListing;
  priority?: boolean;
  className?: string;
}) {
  const t = useT();
  const hasDiscount =
    typeof product.compareAtPriceCents === "number" &&
    product.compareAtPriceCents > product.priceCents;

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface-muted transition-[border-color,box-shadow] duration-300 group-hover:border-border-strong group-hover:shadow-[0_10px_30px_-18px_rgb(11_16_32/0.35)]">
        <Link href={`/products/${product.slug}`} aria-hidden="true" tabIndex={-1} className="block">
          <div className="media-square relative w-full overflow-hidden">
            <Image
              src={product.image.src}
              alt=""
              width={product.image.width}
              height={product.image.height}
              priority={priority}
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw"
              className="size-full object-cover transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.035] group-hover:opacity-0"
            />
            {product.images[1] ? (
              <Image
                src={product.images[1].src}
                alt=""
                width={product.images[1].width}
                height={product.images[1].height}
                sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw"
                className="absolute inset-0 size-full object-cover opacity-0 transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.035] group-hover:opacity-100"
              />
            ) : null}
          </div>
        </Link>
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          {product.availability !== "in-stock" ? (
            <AvailabilityBadge availability={product.availability} />
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1.5">
            {hasDiscount ? <Badge tone="accent">{t("common.sale")}</Badge> : null}
            <WishlistButton
              item={{
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                inventory: product.inventory,
                image: product.image.src,
                currency: product.currency,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3">
        <Price
          amountCents={product.priceCents}
          compareAtPriceCents={product.compareAtPriceCents}
          currency={product.currency}
          size="md"
          className="font-semibold"
        />
        <h3 className="mt-1.5 line-clamp-2 text-sm leading-5 font-medium tracking-[-0.01em] sm:text-[0.9375rem] sm:leading-6">
          <Link
            href={`/products/${product.slug}`}
            className="underline-offset-4 transition-colors hover:text-accent hover:underline"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground sm:text-[0.8125rem]">
          {product.summary}
        </p>
        <MakerLabel vendor={product.vendor} className="mt-auto pt-2.5" />
      </div>
    </article>
  );
}
