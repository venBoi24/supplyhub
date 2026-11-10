"use client";

import type { Availability } from "@/features/catalog/types";
import { Badge } from "@/components/ui/badge";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

const toneByAvailability = {
  "in-stock": "success",
  "low-stock": "clay",
  "sold-out": "neutral",
} as const;

const dotByAvailability = {
  "in-stock": "bg-success",
  "low-stock": "bg-clay",
  "sold-out": "bg-muted-foreground",
} as const;

const labelKeyByAvailability = {
  "in-stock": "common.inStock",
  "low-stock": "common.lowStock",
  "sold-out": "common.soldOut",
} as const;

export function AvailabilityBadge({
  availability,
  className,
}: {
  availability: Availability;
  className?: string;
}) {
  const t = useT();

  return (
    <Badge tone={toneByAvailability[availability]} className={className}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", dotByAvailability[availability])}
      />
      {t(labelKeyByAvailability[availability])}
    </Badge>
  );
}
