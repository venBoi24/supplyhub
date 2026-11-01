import { cn } from "@/lib/utils/cn";
import { formatMoney } from "@/features/catalog/money";

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
} as const;

export interface PriceProps {
  amountCents: number;
  compareAtPriceCents?: number;
  currency?: string;
  size?: keyof typeof sizeClasses;
  className?: string;
}

export function Price({
  amountCents,
  compareAtPriceCents,
  currency = "USD",
  size = "md",
  className,
}: PriceProps) {
  const hasDiscount = typeof compareAtPriceCents === "number" && compareAtPriceCents > amountCents;

  return (
    <span className={cn("inline-flex items-baseline gap-2 tabular-nums", className)}>
      <span className="sr-only">{hasDiscount ? "Sale price:" : "Price:"}</span>
      <span className={cn("font-medium", sizeClasses[size], hasDiscount && "text-clay")}>
        {formatMoney(amountCents, currency)}
      </span>
      {hasDiscount ? (
        <span className="text-xs text-muted-foreground">
          <span className="sr-only">
            {`Original price: ${formatMoney(compareAtPriceCents, currency)}`}
          </span>
          <span className="line-through" aria-hidden="true">
            {formatMoney(compareAtPriceCents, currency)}
          </span>
        </span>
      ) : null}
    </span>
  );
}
