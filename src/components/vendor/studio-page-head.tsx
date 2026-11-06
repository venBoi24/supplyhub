import type { ReactNode } from "react";

export function StudioPageHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground sm:text-[0.8125rem]">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
