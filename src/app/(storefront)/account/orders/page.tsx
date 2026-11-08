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
import { ORDER_STATUS_LABELS, ORDER_STATUS_TONES } from "@/features/checkout/status";
import { formatDateTime } from "@/lib/utils/format-date";
import { requireActor } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track the orders and stock reservations placed with your SupplyHub account.",
  robots: { index: false, follow: false },
};

export default function AccountOrdersPage() {
  return (
    <Suspense fallback={<OrdersSkeleton />}>
      <OrdersContent />
    </Suspense>
  );
}

async function OrdersContent() {
  const actor = await requireActor("/account/orders");
  const orders = await listCustomerOrders(actor.id);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Account
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="eyebrow text-muted-foreground">Orders</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            Your orders
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Each order records the prices and stock checked at checkout. Unpaid reservations release
            automatically when they expire.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link href="/delivery-live?persona=buyer">Track delivery</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/products">Continue browsing</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        {orders.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="size-5" aria-hidden="true" />}
            title="No orders yet"
            description="When you check out, your order and its stock reservation appear here with the exact prices from that moment."
          >
            <Button asChild>
              <Link href="/products">Browse the catalog</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/cart">Review your cart</Link>
            </Button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
            {orders.map((order) => (
              <li key={order.orderNumber}>
                <Link
                  href={`/orders/${order.orderNumber}`}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-5 transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:px-6"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium tabular-nums">{order.orderNumber}</p>
                      <Badge tone={ORDER_STATUS_TONES[order.status]}>
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(order.placedAt)} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "object" : "objects"} from {order.vendorNames.length}{" "}
                      {order.vendorNames.length === 1 ? "studio" : "studios"}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}

function OrdersSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading your orders">
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
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
