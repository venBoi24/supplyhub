"use client";

import type { Vendor } from "@/features/catalog/types";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

export interface MakerLabelProps {
  vendor: Vendor;
  variant?: "tag" | "inline";
  tilt?: boolean;
  className?: string;
}

export function MakerLabel({
  vendor,
  variant = "inline",
  tilt = false,
  className,
}: MakerLabelProps) {
  const t = useT();

  if (variant === "tag") {
    return (
      <div
        className={cn(
          "inline-flex items-stretch overflow-hidden rounded-[3px] border border-clay/35 bg-paper text-paper-foreground shadow-[0_1px_0_rgb(64_41_29/0.08)]",
          tilt && "-rotate-[1.5deg]",
          className,
        )}
      >
        <span className="flex w-11 shrink-0 items-center justify-center border-r border-clay/25 font-display text-sm font-semibold tracking-[-0.02em] text-clay">
          {vendor.monogram}
        </span>
        <span className="flex flex-col justify-center gap-[3px] px-3 py-2">
          <span className="eyebrow text-[0.5rem] leading-none text-clay">
            {t("product.madeBy")}
          </span>
          <span className="font-display text-[0.8125rem] leading-none font-semibold">
            {vendor.name}
          </span>
          <span className="font-mono text-[0.5625rem] leading-none tracking-[0.12em] text-paper-foreground/80 uppercase">
            {vendor.location}
          </span>
        </span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-2 font-mono text-[0.625rem] tracking-[0.13em] text-muted-foreground uppercase",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-[18px] shrink-0 place-items-center rounded-[2px] border border-clay/30 bg-paper font-display text-[0.5rem] leading-none font-semibold text-clay"
      >
        {vendor.monogram}
      </span>
      <span className="truncate">{vendor.name}</span>
      <span aria-hidden="true" className="text-border-strong">
        /
      </span>
      <span className="truncate">{vendor.location.split(",")[0]}</span>
    </span>
  );
}
