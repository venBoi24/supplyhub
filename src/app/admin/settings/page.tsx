import type { Metadata } from "next";

import { PageShell } from "@/components/storefront/page-shell";
import { getServerEnv } from "@/lib/config/env";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("admin.settings"),
    description: t("admin.overviewIntro"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminSettingsPage() {
  const { t } = await getServerI18n();
  await requireAdmin();
  const env = getServerEnv();

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        {t("admin.settings")}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        Read-only runtime configuration. Secrets are not displayed.
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Environment</dt>
          <dd className="mt-2 font-medium">{env.NODE_ENV}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Storage driver</dt>
          <dd className="mt-2 font-medium">{env.STORAGE_DRIVER}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Payment provider</dt>
          <dd className="mt-2 font-medium">{env.PAYMENT_PROVIDER}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Commission basis points</dt>
          <dd className="mt-2 font-medium">{env.PLATFORM_COMMISSION_BPS}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Reservation minutes</dt>
          <dd className="mt-2 font-medium">{env.CHECKOUT_RESERVATION_MINUTES}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <dt className="eyebrow text-muted-foreground">Site URL</dt>
          <dd className="mt-2 font-medium break-all">{env.NEXT_PUBLIC_SITE_URL}</dd>
        </div>
      </dl>
    </PageShell>
  );
}

export const instant = false;
