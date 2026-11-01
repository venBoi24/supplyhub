import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderStatusForm } from "@/components/vendor/order-status-form";
import { StudioNav } from "@/components/vendor/studio-nav";
import { PageShell } from "@/components/storefront/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
import { listVendorOrders } from "@/features/checkout/vendor-operations";
import { ORDER_STATUS_LABELS } from "@/features/checkout/status";
import { requireApprovedVendor } from "@/server/auth/guards";
import { formatDate } from "@/lib/utils/format-date";
import { PackageCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Studio orders",
  robots: { index: false, follow: false },
};

export default function VendorOrdersPage() {
  return (
    <Suspense fallback={<PageShell className="pt-12">Loading studio orders…</PageShell>}>
      <VendorOrdersContent />
    </Suspense>
  );
}

async function VendorOrdersContent() {
  const { vendorId } = await requireApprovedVendor("/vendor/orders");
  const orders = await listVendorOrders(vendorId);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">Studio workspace</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        Your orders.
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Orders are limited to your studio. Move each paid order through processing, shipped, and
        delivered as work progresses.
      </p>
      <div className="mt-6">
        <StudioNav />
      </div>
      {orders.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<PackageCheck className="size-5" aria-hidden="true" />}
          title="No studio orders yet."
          description="Orders containing your products will appear here after payment is confirmed."
        />
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => (
            <li key={order.id} className="rounded-xl border border-border bg-surface p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-mono text-sm font-medium">{order.order.orderNumber}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    For {order.order.recipientName} · {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatMoney(decimalToCents(order.subtotal), order.currency)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ORDER_STATUS_LABELS[order.status]}
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
    </PageShell>
  );
}
