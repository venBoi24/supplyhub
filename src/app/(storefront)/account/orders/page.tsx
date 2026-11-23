import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, PackageSearch } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/features/catalog/money";
import { listCustomerOrders } from "@/features/checkout/queries";
import { ORDER_STATUS_LABEL_KEYS, ORDER_STATUS_TONES } from "@/features/checkout/status";
import { requireActor } from "@/server/auth/guards";
import { getServerI18n, type ServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("orders.listMetaTitle"),
    description: t("orders.listMetaDescription"),
    robots: { index: false, follow: false },
  };
}

export default function AccountOrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}

async function OrdersContent() {
  const [{ t, formatDate }, actor] = await Promise.all([
    getServerI18n(),
    requireActor("/account/orders"),
  ]);
  const orders = await listCustomerOrders(actor.id);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("account.account")}
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="eyebrow text-muted-foreground">{t("orders.eyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {t("orders.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("orders.intro")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/delivery-live?persona=buyer">{t("orders.trackDelivery")}</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/products">{t("orders.continueBrowsing")}</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {orders.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="size-5" aria-hidden="true" />}
            title={t("orders.emptyTitle")}
            description={t("orders.emptyBody")}
          >
            <Button asChild>
              <Link href="/products">{t("common.browseCatalog")}</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/cart">{t("orders.reviewYourCart")}</Link>
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {orders.map((order) => (
              <li key={order.orderNumber}>
                <OrderRow order={order} i18n={{ t, formatDate }} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

type CustomerOrderRow = Awaited<ReturnType<typeof listCustomerOrders>>[number];

function OrderRow({
  order,
  i18n,
}: {
  order: CustomerOrderRow;
  i18n: Pick<ServerI18n, "t" | "formatDate">;
}) {
  const { t, formatDate } = i18n;

  return (
    <Link
      href={`/orders/${order.orderNumber}`}
      className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:px-6"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium tabular-nums">{order.orderNumber}</p>
          <Badge tone={ORDER_STATUS_TONES[order.status]}>
            {t(ORDER_STATUS_LABEL_KEYS[order.status])}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("orders.lineSummary", {
            objects: t(order.itemCount === 1 ? "orders.objectCountOne" : "orders.objectCountMany", {
              count: order.itemCount,
            }),
            studios: t("common.studioCount", {
              count: order.vendorNames.length,
              studios: t(order.vendorNames.length === 1 ? "common.studioOne" : "common.studioMany"),
            }),
            date: formatDate(order.placedAt),
          })}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {order.vendorNames.join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <p className="text-sm font-medium tabular-nums">
          {formatMoney(order.totalCents, order.currency)}
        </p>
        <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
    </Link>
  );
}

async function OrdersSkeleton() {
  const { t } = await getServerI18n();
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={t("orders.loadingOrders")}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-lg" />
        </div>
        <div className="mt-8 space-y-px">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="mt-3 h-24 w-full rounded-xl" />
          <Skeleton className="mt-3 h-24 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </PageShell>
  );
}

export const instant = false;
