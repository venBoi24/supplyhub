"use client";

import Image from "next/image";
import { useState } from "react";

import { AvailabilityBadge } from "@/components/storefront/availability-badge";
import type { CatalogImage } from "@/features/catalog/types";
import { cn } from "@/lib/utils/cn";

export interface ProductGalleryProps {
  images: readonly CatalogImage[];
  name: string;
  soldOut?: boolean;
}

/**
 * Square product gallery. The stage keeps every frame in the same container so photos never
 * stretch or jump between angles, and thumbnails only appear when a listing has more than one.
 */
export function ProductGallery({ images, name, soldOut = false }: ProductGalleryProps) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return null;
  }

  const frames = images;
  const showThumbnails = images.length > 1;

  return (
    <div>
      <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-muted">
        <div className="media-square relative w-full">
          {frames.map((image, index) => (
            <Image
              key={image.src}
              src={image.src}
              alt={index === active ? image.alt : ""}
              width={image.width}
              height={image.height}
              priority={index === 0}
              sizes="(min-width: 1024px) 55vw, 100vw"
              aria-hidden={index === active ? undefined : true}
              className={cn(
                "absolute inset-0 size-full object-cover transition-opacity duration-500 ease-out",
                index === active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            />
          ))}
        </div>
        {soldOut ? (
          <div className="absolute top-4 left-4">
            <AvailabilityBadge availability="sold-out" />
          </div>
        ) : null}
      </div>

      {showThumbnails ? (
        <ul aria-label={`${name} images`} className="mt-3 flex flex-wrap gap-2.5 sm:gap-3">
          {frames.map((image, index) => (
            <li key={image.src}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`View image ${index + 1} of ${frames.length}`}
                aria-current={index === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-lg border bg-surface-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:size-20",
                  index === active
                    ? "border-foreground/70"
                    : "border-border hover:border-border-strong",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  width={image.width}
                  height={image.height}
                  sizes="80px"
                  className="size-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
