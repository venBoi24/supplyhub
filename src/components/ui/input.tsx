import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export function Input({ className, type, ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-md border border-border bg-surface px-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors placeholder:text-muted-foreground/75 hover:border-border-strong focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
