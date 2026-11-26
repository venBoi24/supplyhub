import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/page-shell";
import { getAdminProductCounts, listAdminCategories } from "@/features/catalog/admin-queries";
import { getAdminDashboardMetrics } from "@/features/admin/queries";
import { getServerI18n } from "@/i18n/server";
import { getServerEnv } from "@/lib/config/env";
import { requireAdmin } from "@/server/auth/guards";
import type { AdminCategorySummary } from "@/features/catalog/admin-queries";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("admin.reports"),
    description: t("admin.overviewIntro"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminReportsPage() {
  const { t, formatNumber } = await getServerI18n();
  await requireAdmin();
  const [metrics, counts, categories] = await Promise.all([
    getAdminDashboardMetrics(),
    getAdminProductCounts(),
    listAdminCategories(),
  ]);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        {t("admin.reports")}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
        {t("admin.overviewIntro")}
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.customerAccounts")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">{formatNumber(metrics.users)}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.approvedVendors")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">
            {formatNumber(metrics.vendors)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.publishedProducts")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">
            {formatNumber(metrics.products)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.orders")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">{formatNumber(metrics.orders)}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.paidOrFulfilling")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">
            {formatNumber(metrics.paidOrders)}
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <dt className="eyebrow text-muted-foreground">{t("admin.applicationsToReview")}</dt>
          <dd className="mt-3 font-display text-4xl font-medium">
            {formatNumber(metrics.pendingApplications)}
          </dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium tracking-[-0.03em]">Post status</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.entries(counts) as [string, number][]).map(([status, count]) => (
            <div key={status} className="rounded-xl border border-border bg-surface p-4">
              <p className="eyebrow text-muted-foreground">{status}</p>
              <p className="mt-2 font-display text-2xl font-medium">{formatNumber(count)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-medium tracking-[-0.03em]">Departments</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category: AdminCategorySummary) => (
            <li key={category.id} className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">{category.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatNumber(category.publishedCount)} published ·{" "}
                {formatNumber(category.productCount)} total
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-8">
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/posts">{t("admin.posts")}</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export const instant = false;
