import type { Metadata } from "next";
import { PackageCheck } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusForm } from "@/components/vendor/order-status-form";
import { OrderStatusPill } from "@/components/vendor/order-status-pill";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
import { listVendorOrders } from "@/features/checkout/vendor-operations";
import { formatDate } from "@/lib/utils/format-date";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.ordersTitle"),
    robots: { index: false, follow: false },
  };
}

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <VendorOrdersContent />
    </Suspense>
  );
}

async function VendorOrdersContent() {
  const [{ t }, { vendorId }] = await Promise.all([
    getServerI18n(),
    requireApprovedVendor("/vendor/orders"),
  ]);
  const orders = await listVendorOrders(vendorId);

  return (
    <>
      <StudioPageHead
        title={t("studio.orders")}
        description={t("studio.ordersIntro")}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/api/vendor/orders/export">{t("studio.exportCsv")}</Link>
          </Button>
        }
      />

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="size-5" aria-hidden="true" />}
          title={t("studio.noOrdersTitle")}
          description={t("studio.noOrdersBody")}
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-mono text-sm font-medium">{order.order.orderNumber}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("studio.orderFor", {
                      name: order.order.recipientName,
                      date: formatDate(order.createdAt),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <OrderStatusPill status={order.status} />
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {formatMoney(decimalToCents(order.subtotal), order.currency)}
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
                {order.items.map((item, index) => (
                  <li key={`${order.id}-${index}`} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {item.productName}{" "}
                      <span className="text-muted-foreground">× {item.quantity}</span>
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 border-t border-border pt-4">
                <OrderStatusForm orderId={order.id} status={order.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function OrdersSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingOrders")}>
      <div className="mb-5">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 w-full rounded-xl" />
        ))}
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
