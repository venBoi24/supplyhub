import { DEMO_CATALOG_NOTICE } from "@/features/catalog/constants";

import { PageShell } from "./page-shell";

export function AnnouncementBar() {
  return (
    <div className="bg-primary text-primary-foreground">
      <PageShell className="flex h-8 items-center justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2 font-mono text-[0.5625rem] tracking-[0.16em] uppercase">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-clay" />
          <span className="truncate sm:hidden">Preview catalog · demo data</span>
          <span className="hidden truncate sm:inline">{DEMO_CATALOG_NOTICE}</span>
        </p>
        <p className="hidden shrink-0 font-mono text-[0.5625rem] tracking-[0.16em] text-primary-foreground/65 uppercase sm:block">
          Independent studios · Marketplace operations
        </p>
      </PageShell>
    </div>
  );
}
