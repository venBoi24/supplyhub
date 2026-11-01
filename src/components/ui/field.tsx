import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
        </label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-md border border-border bg-surface px-3.5 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgb(255_255_255/0.04)] transition-colors placeholder:text-muted-foreground/75 hover:border-border-strong focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
