import { getServerI18n } from "@/i18n/server";

import { PageShell } from "./page-shell";

export async function AnnouncementBar() {
  const { t } = await getServerI18n();
  return (
    <div className="bg-primary text-primary-foreground">
      <PageShell className="flex h-8 items-center justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2 font-mono text-[0.5625rem] tracking-[0.16em] uppercase">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent" />
          <span className="truncate sm:hidden">{t("announcement.short")}</span>
          <span className="hidden truncate sm:inline">{t("announcement.notice")}</span>
        </p>
        <p className="hidden shrink-0 font-mono text-[0.5625rem] tracking-[0.16em] text-primary-foreground/65 uppercase sm:block">
          {t("announcement.tagline")}
        </p>
      </PageShell>
    </div>
  );
}
