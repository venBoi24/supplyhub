"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const slides = [
  {
    src: "/images/demo/hero.jpg",
    alt: "A cream stoneware vessel, two speckled cups, a folded linen throw, and a tan leather tote arranged on a limestone plinth.",
  },
  {
    src: "/images/demo/ridge-carafe.jpg",
    alt: "A speckled ceramic carafe with a curved handle on a neutral background.",
  },
  {
    src: "/images/demo/linen-throw.jpg",
    alt: "A folded stonewashed linen throw in a warm neutral tone.",
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

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-[0_24px_70px_rgba(4,8,20,0.45)]"
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
            sizes="(min-width: 1024px) 48vw, 100vw"
            className={`object-cover transition-opacity duration-700 ease-out ${
              itemIndex === index ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
        />
      </div>

      <div className="absolute inset-y-0 left-0 flex items-center pl-3">
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full bg-white/85 text-[#0b1020] shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          onClick={() => goTo(index - 1)}
          aria-label="Previous slide"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <button
          type="button"
          className="grid size-9 place-items-center rounded-full bg-white/85 text-[#0b1020] shadow-sm transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          onClick={() => goTo(index + 1)}
          aria-label="Next slide"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-4 p-4">
        <p className="text-[0.6875rem] tracking-[0.14em] text-white/70 uppercase">
          {index + 1} / {slides.length}
        </p>
        <div className="flex items-center gap-2">
          {slides.map((item, itemIndex) => (
            <button
              key={item.src}
              type="button"
              onClick={() => goTo(itemIndex)}
              aria-label={`Go to slide ${itemIndex + 1}`}
              aria-current={itemIndex === index}
              className={`h-1.5 rounded-full transition-all ${
                itemIndex === index ? "w-6 bg-white" : "w-1.5 bg-white/55 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
