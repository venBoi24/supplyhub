import Image from "next/image";
import Link from "next/link";

import type { ProductListing } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
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
  const hasDiscount =
    typeof product.compareAtPriceCents === "number" &&
    product.compareAtPriceCents > product.priceCents;

  return (
    <article className={cn("group flex h-full flex-col", className)}>
      <div className="relative overflow-hidden rounded-xl border border-border bg-surface-muted transition-all duration-300 group-hover:border-accent/40 group-hover:shadow-sm">
        <Link href={`/products/${product.slug}`} aria-hidden="true" tabIndex={-1} className="block">
          <Image
            src={product.image.src}
            alt=""
            width={product.image.width}
            height={product.image.height}
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw"
            className="aspect-[4/5] w-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.025] group-hover:opacity-0"
          />
          {product.images[1] ? (
            <Image
              src={product.images[1].src}
              alt=""
              width={product.images[1].width}
              height={product.images[1].height}
              sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 46vw"
              className="absolute inset-0 aspect-[4/5] w-full object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
            />
          ) : null}
        </Link>
        <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          {product.availability !== "in-stock" ? (
            <AvailabilityBadge availability={product.availability} />
          ) : (
            <span />
          )}
          {hasDiscount ? <Badge tone="accent">Sale</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-3.5 sm:pt-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <h3 className="min-w-0 font-display text-base leading-snug font-medium tracking-[-0.015em] sm:text-lg">
            <Link
              href={`/products/${product.slug}`}
              className="decoration-border-strong underline-offset-4 transition-colors hover:text-accent hover:underline"
            >
              {product.name}
            </Link>
          </h3>
          <Price
            amountCents={product.priceCents}
            compareAtPriceCents={product.compareAtPriceCents}
            currency={product.currency}
            size="sm"
            className="sm:shrink-0 sm:pt-0.5"
          />
        </div>
        <p className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-5 text-muted-foreground">
          {product.summary}
        </p>
        <MakerLabel vendor={product.vendor} className="mt-auto pt-3" />
      </div>
    </article>
  );
}
