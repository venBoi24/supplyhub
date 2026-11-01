import type { ComponentProps } from "react";

import { cn } from "@/lib/utils/cn";

export function PageShell({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-8", className)}
      {...props}
    />
  );
}
