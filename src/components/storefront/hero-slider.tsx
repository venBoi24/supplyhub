"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

const slides = [
  {
    src: "/images/demo/hero.jpg",
    alt: "A cream stoneware vessel, two speckled cups, a folded linen throw, and a tan leather tote arranged on a limestone plinth.",
    eyebrow: "New arrivals",
    title: "Objects with a maker's name on them.",
    description: "Browse ceramics, leather, and cloth listed by the studios that made them.",
    href: "/products",
    cta: "Shop all objects",
  },
  {
    src: "/images/demo/ridge-carafe.jpg",
    alt: "A speckled ceramic carafe with a curved handle on a neutral background.",
    eyebrow: "Ceramics",
    title: "Stoneware for daily use.",
    description: "Pieces from independent ceramic studios, with materials and dimensions listed.",
    href: "/categories/ceramics",
    cta: "Browse ceramics",
  },
  {
    src: "/images/demo/linen-throw.jpg",
    alt: "A folded stonewashed linen throw in a warm neutral tone.",
    eyebrow: "Textiles",
    title: "Cloth with provenance.",
    description: "Linen and woven goods from studios that name their materials and process.",
    href: "/categories/textiles",
    cta: "Browse textiles",
  },
] as const;

export function HeroSlider() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [paused]);

  function goTo(nextIndex: number) {
    setIndex((nextIndex + slides.length) % slides.length);
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    if (touchStartX.current === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(delta) > 48) {
      goTo(delta < 0 ? index + 1 : index - 1);
    }
  }

  const slide = slides[index] as (typeof slides)[number];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-sm"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative aspect-[4/5] w-full sm:aspect-[16/10] lg:aspect-[4/5]">
        {slides.map((item, itemIndex) => (
          <Image
            key={item.src}
            src={item.src}
            alt={item.alt}
            fill
            priority={itemIndex === 0}
            sizes="(min-width: 1024px) 54vw, 100vw"
            className={`object-cover transition-opacity duration-700 ease-out ${
              itemIndex === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent"
        />
        <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-8">
          <p className="eyebrow text-white/75">{slide.eyebrow}</p>
          <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">
            {slide.title}
          </h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-white/80">{slide.description}</p>
          <Button asChild size="sm" variant="secondary" className="mt-4">
            <Link href={slide.href}>{slide.cta}</Link>
          </Button>
        </div>
      </div>

      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="grid size-9 place-items-center rounded-full bg-white/85 text-foreground shadow-sm hover:bg-white"
          onClick={() => goTo(index - 1)}
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="grid size-9 place-items-center rounded-full bg-white/85 text-foreground shadow-sm hover:bg-white"
          onClick={() => goTo(index + 1)}
          aria-label="Next slide"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <div className="absolute right-4 bottom-4 flex items-center gap-2">
        {slides.map((item, itemIndex) => (
          <button
            key={item.src}
            type="button"
            onClick={() => goTo(itemIndex)}
            aria-label={`Go to slide ${itemIndex + 1}`}
            aria-current={itemIndex === index}
            className={`h-2.5 rounded-full transition-all ${
              itemIndex === index ? "w-7 bg-white" : "w-2.5 bg-white/55 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
