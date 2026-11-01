import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-[0.625rem] uppercase leading-none tracking-[0.14em]",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface text-muted-foreground",
        accent: "border-accent/25 bg-accent-soft text-accent",
        clay: "border-clay/25 bg-clay-soft text-clay",
        success: "border-success/25 bg-success/10 text-success",
        danger: "border-danger/25 bg-danger/10 text-danger",
      },
    },
    defaultVariants: {
      tone: "neutral",
    },
  },
);

export interface BadgeProps extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
