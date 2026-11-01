import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start rounded-xl border border-dashed border-border-strong/70 bg-surface/60 px-6 py-12 sm:px-10 sm:py-16",
        className,
      )}
    >
      {icon ? (
        <div className="mb-5 grid size-11 place-items-center rounded-md border border-border bg-surface text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-balance">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      {children ? <div className="mt-6 flex flex-wrap items-center gap-3">{children}</div> : null}
    </div>
  );
}
