import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { parseEnumParam, parseSearchTerm, searchParamValue } from "@/features/admin/filters";
import { listAdminOrders } from "@/features/admin/queries";
import { ORDER_STATUS_LABELS, ORDER_STATUS_LABEL_KEYS } from "@/features/checkout/status";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
import type { OrderStatus } from "@/generated/prisma/enums";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.orders"),
    description: t("admin.ordersMetaDescription"),
    robots: { index: false, follow: false },
  };
}

const statuses = Object.keys(ORDER_STATUS_LABELS) as OrderStatus[];

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<PageShell className="pt-12">{t("admin.loadingOrders")}</PageShell>}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OrdersContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/orders">["searchParams"];
}) {
  const { t, formatDate, formatNumber } = await getServerI18n();
  await requireAdmin();
  const params = await searchParams;
  const status = parseEnumParam(params.status, statuses);
  const search = parseSearchTerm(params.q);
  const page = parsePage(searchParamValue(params.page));
  const { total, orders, page: currentPage } = await listAdminOrders({ page, status, search });
  const pages = pageCount(total);
  const filterParams = { status, q: search };

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-medium tracking-[-0.04em]">
            {t("admin.ordersTitle")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("admin.ordersIntro", { count: formatNumber(total) })}
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link
            href={`/api/admin/orders/export?${new URLSearchParams({ ...(status ? { status } : {}), ...(search ? { q: search } : {}) }).toString()}`}
          >
            {t("admin.exportMatches")}
          </Link>
        </Button>
      </div>
      <form
        action="/admin/orders"
        className="mt-7 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end"
      >
        <label className="grid gap-2 text-sm">
          {t("admin.ordersSearchLabel")}
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.orderStatusLabel")}
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">{t("admin.allStatuses")}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {t(ORDER_STATUS_LABEL_KEYS[value])}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          {t("common.filter")}
        </Button>
      </form>
      <ul className="mt-6 space-y-3">
        {orders.map((order) => (
          <li key={order.id} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-mono text-sm font-medium">{order.orderNumber}</h2>
                <p className="mt-1 text-xs break-all text-muted-foreground">
                  {order.customer.name} · {order.customer.email}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatMoney(decimalToCents(order.total), order.currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(ORDER_STATUS_LABEL_KEYS[order.status])} · {formatDate(order.placedAt)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {order.vendorOrders.map((vendor, index) => (
                <span
                  key={`${order.id}-${index}`}
                  className="rounded-full bg-surface-muted px-3 py-1 text-xs"
                >
                  {vendor.vendor.name}: {t(ORDER_STATUS_LABEL_KEYS[vendor.status])}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {orders.length === 0 ? (
        <p className="mt-6 rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted-foreground">
          {t("admin.ordersEmpty")}
        </p>
      ) : null}
      <PagedNav
        pathname="/admin/orders"
        params={filterParams}
        page={currentPage}
        pageCount={pages}
        label={t("common.pagination")}
      />
    </PageShell>
  );
}

export const instant = false;
