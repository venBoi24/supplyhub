import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/page-shell";
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.title"),
    description: t("admin.overviewIntro"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminIndexPage() {
  const { t, formatNumber } = await getServerI18n();
  await requireAdmin();
  const metrics = await getAdminDashboardMetrics();
  const cards = [
    { label: t("admin.customerAccounts"), value: metrics.users, href: "/admin/users" },
    { label: t("admin.approvedVendors"), value: metrics.vendors, href: "/admin/vendors" },
    { label: t("admin.publishedProducts"), value: metrics.products, href: "/admin/products" },
    { label: t("admin.orders"), value: metrics.orders, href: "/admin/orders" },
    {
      label: t("admin.paidOrFulfilling"),
      value: metrics.paidOrders,
      href: "/admin/orders?status=PAID",
    },
    {
      label: t("admin.applicationsToReview"),
      value: metrics.pendingApplications,
      href: "/admin/vendors",
    },
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        {t("admin.overviewTitle")}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        {t("admin.overviewIntro")}
      </p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:bg-surface-muted"
          >
            <dt className="eyebrow text-muted-foreground">{card.label}</dt>
            <dd className="mt-3 font-display text-4xl font-medium">{formatNumber(card.value)}</dd>
          </Link>
        ))}
      </dl>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/posts">{t("admin.posts")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/reports">{t("admin.reports")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/settings">{t("admin.settings")}</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export const instant = false;
