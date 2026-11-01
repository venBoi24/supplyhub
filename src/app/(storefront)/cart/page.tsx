import type { Metadata } from "next";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { CartLineControls } from "@/components/cart/cart-line-controls";
import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { getCartView } from "@/features/cart/service";
import type { CartLine } from "@/features/cart/types";
import { clearCartAction } from "@/features/cart/actions";
import { formatMoney } from "@/features/catalog/money";
import { canCheckout } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the objects you have selected before checking out.",
  robots: { index: false, follow: false },
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function problemText(line: CartLine): string | null {
  switch (line.problem) {
    case "unavailable":
      return "No longer available";
    case "insufficient-stock":
      return line.availableQuantity === 0 ? "Sold out" : `Only ${line.availableQuantity} available`;
    case "currency-mismatch":
      return "Priced in another currency";
    default:
      return null;
  }
}

export default function CartPage({ searchParams }: PageProps<"/cart">) {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CartContent({ searchParams }: { searchParams: PageProps<"/cart">["searchParams"] }) {
  const [params, view, actor] = await Promise.all([searchParams, getCartView(), getSessionActor()]);
  const updated = searchParamValue(params.updated) === "1";
  const removed = searchParamValue(params.removed) === "1";
  const cleared = searchParamValue(params.cleared) === "1";
  const inactive = searchParamValue(params.inactive) === "1";
  const issue = searchParamValue(params.issue) === "1";

  const groups = new Map<string, CartLine[]>();

  for (const line of view.lines) {
    const key = `${line.vendorName}|${line.vendorSlug}`;
    const group = groups.get(key) ?? [];
    group.push(line);
    groups.set(key, group);
  }

  if (view.lines.length === 0) {
    return (
      <PageShell className="pt-10 sm:pt-14">
        <div className="border-b border-border pb-8">
          <p className="eyebrow text-muted-foreground">Cart</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            Your cart
          </h1>
        </div>
        <div className="mt-8">
          <EmptyState
            icon={<ShoppingBag className="size-5" aria-hidden="true" />}
            title="Your cart is empty"
            description={
              actor
                ? "Objects you add from the catalog appear here and stay with your account."
                : "Objects you add from the catalog appear here. This cart is saved on this device for 30 days — sign in to keep it across devices."
            }
          >
            <Button asChild>
              <Link href="/products">Browse the catalog</Link>
            </Button>
            {!actor ? (
              <Button asChild variant="secondary">
                <Link href="/sign-in?next=%2Fcart">Sign in</Link>
              </Button>
            ) : null}
          </EmptyState>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-8">
        <div>
          <p className="eyebrow text-muted-foreground">Cart</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            Your cart
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {view.itemCount} {view.itemCount === 1 ? "object" : "objects"} from {groups.size}{" "}
            {groups.size === 1 ? "studio" : "studios"}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">Keep browsing</Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {updated ? <Notice tone="success">Quantity updated.</Notice> : null}
        {removed ? <Notice tone="success">Object removed from your cart.</Notice> : null}
        {cleared ? <Notice tone="success">Your cart is now empty.</Notice> : null}
        {inactive ? (
          <Notice tone="warning">This account cannot use the cart while it is suspended.</Notice>
        ) : null}
        {issue ? (
          <Notice tone="warning">
            That quantity is not available. Adjust the line and try again.
          </Notice>
        ) : null}
        {!actor ? (
          <Notice tone="info">
            This cart is saved on this device for 30 days.{" "}
            <Link href="/sign-in?next=%2Fcart" className="font-medium underline underline-offset-4">
              Sign in
            </Link>{" "}
            to keep it with your account and check out.
          </Notice>
        ) : null}
        {view.hasIssues ? (
          <Notice tone="warning">
            Some objects need attention before checkout. Remove them or adjust the quantity below.
          </Notice>
        ) : null}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-8">
          {[...groups.entries()].map(([key, lines]) => {
            const [vendorName, vendorSlug] = key.split("|");

            return (
              <section
                key={key}
                aria-label={`Objects from ${vendorName}`}
                className="rounded-xl border border-border bg-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
                  <div>
                    <p className="eyebrow text-muted-foreground">Studio</p>
                    <p className="mt-1 font-display text-lg font-medium tracking-[-0.02em]">
                      {vendorName}
                    </p>
                  </div>
                  <Link
                    href={`/vendors/${vendorSlug}`}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    Visit studio
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {lines.map((line) => {
                    const problem = problemText(line);

                    return (
                      <li key={line.productId} className="p-5 sm:p-6">
                        <div className="flex gap-4 sm:gap-5">
                          <Link
                            href={`/products/${line.slug}`}
                            className="relative block size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-muted sm:size-24"
                          >
                            <Image
                              src={line.image?.src ?? "/images/demo/placeholder.jpg"}
                              alt={line.image?.alt ?? line.name}
                              width={line.image?.width ?? 1024}
                              height={line.image?.height ?? 1280}
                              sizes="96px"
                              className="size-full object-cover"
                            />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                              <div className="min-w-0">
                                <Link
                                  href={`/products/${line.slug}`}
                                  className="font-display text-lg font-medium tracking-[-0.02em] underline-offset-4 hover:underline"
                                >
                                  {line.name}
                                </Link>
                                <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                                  {line.sku} · {line.currency}{" "}
                                  {formatMoney(line.unitPriceCents, line.currency)}
                                </p>
                                {problem ? (
                                  <p className="mt-2 text-sm text-danger">
                                    {problem}. Remove it or reduce the quantity to continue.
                                  </p>
                                ) : null}
                              </div>
                              <p className="text-sm font-medium tabular-nums">
                                {formatMoney(line.lineTotalCents, line.currency)}
                              </p>
                            </div>
                            <div className="mt-4">
                              <CartLineControls
                                productId={line.productId}
                                quantity={line.quantity}
                                maxQuantity={Math.min(10, line.availableQuantity)}
                              />
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          <form action={clearCartAction}>
            <Button type="submit" variant="ghost" size="sm">
              Clear cart
            </Button>
          </form>
        </div>

        <aside className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Summary</h2>
          <dl className="mt-5 space-y-3 border-b border-border pb-5 text-sm">
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
          <div className="mt-5 flex items-baseline justify-between gap-4">
            <p className="font-medium">Total</p>
            <p className="font-display text-2xl font-medium tracking-[-0.02em] tabular-nums">
              {formatMoney(view.subtotalCents, view.currency)}
            </p>
          </div>

          <div className="mt-6">
            {!actor ? (
              <Button asChild className="w-full">
                <Link href="/sign-in?next=%2Fcheckout">Sign in to check out</Link>
              </Button>
            ) : !canCheckout(actor) ? (
              <p className="rounded-md border border-border bg-surface-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                Only customer accounts can place orders. Operational studio and administrator
                accounts cannot check out.
              </p>
            ) : view.canCheckout ? (
              <Button asChild className="w-full">
                <Link href="/checkout">Continue to checkout</Link>
              </Button>
            ) : (
              <Button disabled className="w-full">
                Resolve cart issues to continue
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">
            Shipping and tax are not calculated in this phase. Checkout reserves stock, then LynxPay
            confirms payment in Tanzanian shillings.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}

function CartSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading your cart">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-72 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
