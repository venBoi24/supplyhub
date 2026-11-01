import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const toneClasses = {
  info: "border-accent/25 bg-accent-soft text-accent",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-clay/25 bg-clay-soft text-clay",
  danger: "border-danger/25 bg-danger/10 text-danger",
} as const;

export interface NoticeProps {
  tone?: keyof typeof toneClasses;
  children: ReactNode;
  className?: string;
}

export function Notice({ tone = "info", children, className }: NoticeProps) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "rounded-md border px-3.5 py-2.5 text-sm leading-5",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
