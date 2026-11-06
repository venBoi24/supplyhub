import { cn } from "@/lib/utils/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden="true"
        className="relative grid size-9 shrink-0 place-items-center rounded-[4px] border border-current"
      >
        <span className="font-display text-[1.05rem] leading-none font-semibold">S</span>
        <span aria-hidden="true" className="absolute -right-[3px] -bottom-[3px] size-2 bg-accent" />
      </span>
      <span className="font-display text-[1.45rem] leading-none font-semibold tracking-[-0.035em]">
        SupplyHub
      </span>
    </span>
  );
}
