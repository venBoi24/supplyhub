"use client";

import { PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { CategorySummary } from "@/features/catalog/types";
import { useT } from "@/i18n/client";

export interface CategoryTileProps {
  category: CategorySummary;
  priority?: boolean;
}

export function CategoryTile({ category, priority = false }: CategoryTileProps) {
  const t = useT();
  const [active, setActive] = useState(0);
  const timers = useRef<{
    first?: ReturnType<typeof setTimeout>;
    repeat?: ReturnType<typeof setInterval>;
  }>({});
  const images = category.images;

  useEffect(() => {
    const current = timers.current;

    return () => {
      if (current.first) clearTimeout(current.first);
      if (current.repeat) clearInterval(current.repeat);
    };
  }, []);

  function stopTimers() {
    if (timers.current.first) {
      clearTimeout(timers.current.first);
      timers.current.first = undefined;
    }
    if (timers.current.repeat) {
      clearInterval(timers.current.repeat);
      timers.current.repeat = undefined;
    }
  }

  function start() {
    if (images.length < 2) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    stopTimers();
    timers.current.first = setTimeout(() => setActive(1), 550);
    timers.current.repeat = setInterval(() => {
      setActive((current) => (current + 1) % images.length);
    }, 2200);
  }

  function stop() {
    stopTimers();
    setActive(0);
  }

  return (
    <Link
      href={`/categories/${category.slug}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      className="group block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-border-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        {images.length > 0 ? (
          images.map((image, index) => (
            <Image
              key={image.src}
              src={image.src}
              alt=""
              fill
              priority={priority && index === 0}
              sizes="(min-width: 1024px) 23vw, (min-width: 640px) 31vw, 46vw"
              className={`object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.02] ${
                index === active ? "opacity-100" : "opacity-0"
              }`}
            />
          ))
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <PackageSearch className="size-8" aria-hidden="true" />
          </div>
        )}

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
        />

        {images.length > 1 ? (
          <div aria-hidden="true" className="absolute top-3 right-3 flex gap-1">
            {images.map((image, index) => (
              <span
                key={image.src}
                className={`block h-[3px] w-4 rounded-full transition-colors duration-300 ${
                  index === active ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="eyebrow text-white/75">
            {category.productCount}{" "}
            {category.productCount === 1 ? t("common.piece") : t("common.pieces")}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em]">
            {category.name}
          </h3>
        </div>
      </div>
      <p className="px-4 py-3 text-sm leading-5 text-muted-foreground">{category.headline}</p>
    </Link>
  );
}
