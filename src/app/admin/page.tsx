import type { Metadata } from "next";
import Link from "next/link";

import { PageShell } from "@/components/storefront/page-shell";
import { AdminActivityTabs } from "@/components/admin/admin-activity-tabs";
import { Button } from "@/components/ui/button";
import {
  getAdminDashboardMetrics,
  getAdminOrderStatusCounts,
  getAdminRecentRevenue,
  listAdminOrders,
  listAdminRecentVendors,
} from "@/features/admin/queries";
import { listAdminProducts } from "@/features/catalog/admin-queries";
import { listVendorApplications } from "@/features/vendors/queries";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
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

function money(cents: number, currency = "TZS") {
  return formatMoney(cents, currency);
}

export default async function AdminIndexPage() {
  const { t, formatNumber, formatDate } = await getServerI18n();
  await requireAdmin();

  const [
    metrics,
    statusCounts,
    revenue,
    recentOrdersResult,
    recentVendors,
    recentProductsResult,
    pendingApplicationsResult,
  ] = await Promise.all([
    getAdminDashboardMetrics(),
    getAdminOrderStatusCounts(),
    getAdminRecentRevenue(7),
    listAdminOrders({ page: 1 }),
    listAdminRecentVendors(5),
    listAdminProducts({ page: 1 }),
    listVendorApplications({ page: 1, status: "PENDING" }),
  ]);

  const recentOrders = recentOrdersResult.orders.slice(0, 5).map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    customer: order.customer.name,
    status: order.status,
    total: money(decimalToCents(order.total), order.currency),
    placedAt: formatDate(order.placedAt),
  }));

  const newVendors = recentVendors.map((vendor) => ({
    id: vendor.slug,
    name: vendor.name,
    status: vendor.status,
    location: vendor.location || "Location not listed",
    createdAt: formatDate(vendor.createdAt),
  }));

  const recentPosts = recentProductsResult.products.slice(0, 5).map((product) => ({
    id: product.id,
    name: product.name,
    vendor: product.vendorName,
    status: product.status,
    price: money(product.priceCents, product.currency),
    updatedAt: formatDate(product.updatedAt),
  }));

  const pendingApplications = pendingApplicationsResult.applications.slice(0, 5).map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    owner: vendor.owner.name,
    submittedAt: formatDate(vendor.createdAt),
  }));

  const maxRevenue = Math.max(...revenue.map((day) => day.cents), 1);
  const maxStatusCount = Math.max(...statusCounts.map((entry) => entry.count), 1);
  const averageOrderValue =
    metrics.paidOrders > 0 ? Math.round(metrics.totalSalesCents / metrics.paidOrders) : 0;
  const paidRate = metrics.orders > 0 ? Math.round((metrics.paidOrders / metrics.orders) * 100) : 0;

  const cards = [
    { label: t("admin.customerAccounts"), value: metrics.users, href: "/admin/users" },
    { label: t("admin.approvedVendors"), value: metrics.vendors, href: "/admin/vendors" },
    { label: t("admin.publishedProducts"), value: metrics.products, href: "/admin/posts" },
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
    {
      label: t("admin.totalSales"),
      value: money(metrics.totalSalesCents, "TZS"),
      href: "/admin/reports",
    },
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
              {t("admin.welcomeBack")}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
              {t("admin.dashboardIntro")}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="sm">
              <Link href="/">{t("admin.viewMarketplace")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/vendors">{t("admin.applicationsToReview")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:bg-surface-muted"
          >
            <dt className="eyebrow text-muted-foreground">{card.label}</dt>
            <dd className="mt-3 font-display text-3xl font-medium">{card.value}</dd>
          </Link>
        ))}
      </dl>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em]">
            {t("admin.salesOverview")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("admin.paidOrFulfilling")}: {formatNumber(metrics.paidOrders)} ·{" "}
            {t("admin.averageOrderValue")}: {money(averageOrderValue, "TZS")} ·{" "}
            {t("admin.paidRate")}: {paidRate}%
          </p>
          <div className="mt-6 flex h-40 items-end gap-2">
            {revenue.map((day) => (
              <div key={day.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-28 w-full items-end rounded-md bg-surface-muted">
                  <div
                    className="w-full rounded-md bg-accent"
                    style={{
                      height: `${Math.max(6, Math.round((day.cents / maxRevenue) * 100))}%`,
                    }}
                    aria-label={`${day.label}: ${money(day.cents, "TZS")}`}
                  />
                </div>
                <span className="text-[0.625rem] text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-2xl font-medium tracking-[-0.03em]">
            {t("admin.ordersByStatus")}
          </h2>
          <div className="mt-5 space-y-3">
            {statusCounts.map((entry) => (
              <div key={entry.status}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium">{entry.status}</span>
                  <span className="text-muted-foreground tabular-nums">{entry.count}</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-muted">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{
                      width: `${Math.max(4, Math.round((entry.count / maxStatusCount) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <AdminActivityTabs
        orders={recentOrders}
        vendors={newVendors}
        posts={recentPosts}
        applications={pendingApplications}
      />

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/users">{t("admin.users")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/vendors">{t("admin.vendors")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/posts">{t("admin.posts")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/categories">{t("admin.departments")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/orders">{t("admin.orders")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/payments">{t("admin.payments")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/payouts">{t("admin.payouts")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/reports">{t("admin.reports")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/audit">{t("admin.audit")}</Link>
        </Button>
        <Button asChild variant="secondary" size="sm">
          <Link href="/admin/settings">{t("admin.settings")}</Link>
        </Button>
      </div>
    </PageShell>
  );
}

export const instant = false;
