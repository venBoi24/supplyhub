import { cn } from "@/lib/utils/cn";

export function Wordmark({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "relative grid shrink-0 place-items-center rounded-[4px] border border-current",
          compact ? "size-7" : "size-9",
        )}
      >
        <span
          className={cn(
            "font-display leading-none font-semibold",
            compact ? "text-[0.9rem]" : "text-[1.05rem]",
          )}
        >
          S
        </span>
        <span aria-hidden="true" className="absolute -right-[3px] -bottom-[3px] size-2 bg-accent" />
      </span>
      <span
        className={cn(
          "font-display leading-none font-semibold tracking-[-0.035em]",
          compact ? "text-[1.15rem]" : "text-[1.45rem]",
        )}
      >
        SupplyHub
      </span>
    </span>
  );
}
