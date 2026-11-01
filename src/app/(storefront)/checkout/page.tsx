import type { Metadata } from "next";
import { Lock } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { getCartView } from "@/features/cart/service";
import type { CartLine } from "@/features/cart/types";
import { formatMoney } from "@/features/catalog/money";
import { getServerEnv } from "@/lib/config/env";
import { requireCustomer } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm the delivery details for your SupplyHub order.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}

async function CheckoutContent() {
  const actor = await requireCustomer("/checkout");
  const view = await getCartView();

  if (view.lines.length === 0) {
    return (
      <PageShell className="pt-10 sm:pt-14">
        <div className="border-b border-border pb-8">
          <p className="eyebrow text-muted-foreground">Checkout</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            Nothing to check out
          </h1>
        </div>
        <div className="mt-8">
          <EmptyState
            icon={<Lock className="size-5" aria-hidden="true" />}
            title="Your cart is empty"
            description="Add an object from the catalog before checking out. Your delivery details are only requested at this step."
          >
            <Button asChild>
              <Link href="/products">Browse the catalog</Link>
            </Button>
          </EmptyState>
        </div>
      </PageShell>
    );
  }

  const groups = new Map<string, CartLine[]>();

  for (const line of view.lines) {
    const group = groups.get(line.vendorName) ?? [];
    group.push(line);
    groups.set(line.vendorName, group);
  }

  const reservationMinutes = getServerEnv().CHECKOUT_RESERVATION_MINUTES;

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Checkout</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
          Confirm your order
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Prices and stock are checked again on the server when you place the order. Your cart may
          be split into one order per studio.
        </p>
      </div>

      {!view.canCheckout ? (
        <Notice tone="warning" className="mt-6">
          Some objects in your cart are unavailable or priced differently.{" "}
          <Link href="/cart" className="font-medium underline underline-offset-4">
            Review your cart
          </Link>{" "}
          before checking out.
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <section
          aria-labelledby="delivery-heading"
          className="rounded-xl border border-border bg-surface p-6 sm:p-8"
        >
          <h2 id="delivery-heading" className="font-display text-xl font-medium tracking-[-0.02em]">
            Delivery details
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            These details are stored with the order. Payment details are never collected here.
          </p>
          <div className="mt-6">
            <CheckoutForm
              defaultName={actor.name}
              defaultEmail={actor.email}
              reservationMinutes={reservationMinutes}
            />
          </div>
        </section>

        <aside className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Order summary</h2>
          <div className="mt-5 space-y-5">
            {[...groups.entries()].map(([vendorName, lines]) => (
              <div key={vendorName}>
                <p className="eyebrow text-muted-foreground">{vendorName}</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {lines.map((line) => (
                    <li key={line.productId} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="line-clamp-2">{line.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {line.quantity} × {formatMoney(line.unitPriceCents, line.currency)}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatMoney(line.lineTotalCents, line.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(view.subtotalCents, view.currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-muted-foreground">Not calculated</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">Tax</dt>
              <dd className="text-muted-foreground">Not calculated</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-border pt-5">
            <p className="font-medium">Total</p>
            <p className="font-display text-2xl font-medium tracking-[-0.02em] tabular-nums">
              {formatMoney(view.subtotalCents, view.currency)}
            </p>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            LynxPay sandbox checkout: payment is collected in Tanzanian shillings on the next step.
            Shipping and tax are not calculated in this phase.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}

function CheckoutSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading checkout">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-[34rem] w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
