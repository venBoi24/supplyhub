import { ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import type { ProductListing, VendorSummary } from "@/features/catalog/types";
import { cn } from "@/lib/utils/cn";

export function StudioFeatureCard({
  vendor,
  image,
  priority = false,
  className,
}: {
  vendor: VendorSummary;
  image: ProductListing;
  priority?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className={cn(
        "group relative flex min-h-[24rem] overflow-hidden rounded-xl border border-border bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className,
      )}
    >
      <Image
        src={image.image.src}
        alt=""
        width={image.image.width}
        height={image.image.height}
        priority={priority}
        sizes="(min-width: 1024px) 40vw, 100vw"
        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.025]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#080d1a]/90 via-[#080d1a]/25 to-transparent"
      />
      <div className="relative mt-auto w-full p-6 text-white sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow text-white/65">
              {vendor.discipline} · {vendor.location}
            </p>
            <h3 className="mt-2 font-display text-3xl font-medium tracking-[-0.03em]">
              {vendor.name}
            </h3>
            <p className="mt-2 text-sm text-white/75">
              {vendor.productCount} objects · Visit the studio
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-white/25 bg-white/10 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#0b1020]">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function StudioCompactCard({
  vendor,
  className,
}: {
  vendor: VendorSummary;
  className?: string;
}) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className={cn(
        "group flex min-h-[12rem] flex-col justify-between rounded-xl border border-border bg-surface p-6 transition-colors duration-300 hover:border-accent/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          aria-hidden="true"
          className="grid size-12 place-items-center rounded-[4px] border border-clay/30 bg-paper font-display text-lg font-semibold text-clay"
        >
          {vendor.monogram}
        </span>
        <ArrowUpRight
          className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
          aria-hidden="true"
        />
      </div>
      <div className="mt-10">
        <p className="eyebrow text-muted-foreground">
          {vendor.discipline} · {vendor.location}
        </p>
        <h3 className="mt-2 font-display text-2xl font-medium tracking-[-0.03em]">{vendor.name}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {vendor.productCount} objects in this edit
        </p>
      </div>
    </Link>
  );
}
