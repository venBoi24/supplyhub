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
import { getServerI18n } from "@/i18n/server";
import type { Translator } from "@/i18n/dictionary";
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

function problemText(line: CartLine, t: Translator): string | null {
  switch (line.problem) {
    case "unavailable":
      return t("cart.problemUnavailable");
    case "insufficient-stock":
      return line.availableQuantity === 0
        ? t("common.soldOut")
        : t("cart.problemOnly", { count: line.availableQuantity });
    case "currency-mismatch":
      return t("cart.problemCurrency");
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
  const [params, { t }, view, actor] = await Promise.all([
    searchParams,
    getServerI18n(),
    getCartView(),
    getSessionActor(),
  ]);
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
          <p className="eyebrow text-muted-foreground">{t("cart.cart")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {t("cart.title")}
          </h1>
        </div>
        <div className="mt-8">
          <EmptyState
            icon={<ShoppingBag className="size-5" aria-hidden="true" />}
            title={t("cart.emptyTitle")}
            description={actor ? t("cart.emptySignedIn") : t("cart.emptyGuest")}
          >
            <Button asChild>
              <Link href="/products">{t("common.browseCatalog")}</Link>
            </Button>
            {!actor ? (
              <Button asChild variant="secondary">
                <Link href="/sign-in?next=%2Fcart">{t("account.signIn")}</Link>
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
          <p className="eyebrow text-muted-foreground">{t("cart.cart")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {t("cart.title")}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("cart.summaryLine", {
              objects: t("products.objectCount", {
                count: view.itemCount,
                objects: view.itemCount === 1 ? t("nav.object") : t("nav.objects"),
              }),
              studios: t("common.studioCount", {
                count: groups.size,
                studios: groups.size === 1 ? t("common.studioOne") : t("common.studioMany"),
              }),
            })}
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/products">{t("cart.keepBrowsing")}</Link>
        </Button>
      </div>

      <div className="mt-6 space-y-3">
        {updated ? <Notice tone="success">{t("cart.quantityUpdated")}</Notice> : null}
        {removed ? <Notice tone="success">{t("cart.removed")}</Notice> : null}
        {cleared ? <Notice tone="success">{t("cart.cleared")}</Notice> : null}
        {inactive ? <Notice tone="warning">{t("cart.suspended")}</Notice> : null}
        {issue ? <Notice tone="warning">{t("cart.issue")}</Notice> : null}
        {!actor ? (
          <Notice tone="info">
            {t("cart.guestNotice")}{" "}
            <Link href="/sign-in?next=%2Fcart" className="font-medium underline underline-offset-4">
              {t("account.signIn")}
            </Link>{" "}
            {t("cart.guestNoticeTail")}
          </Notice>
        ) : null}
        {view.hasIssues ? <Notice tone="warning">{t("cart.hasIssues")}</Notice> : null}
      </div>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-8">
          {[...groups.entries()].map(([key, lines]) => {
            // Both fields are required on CartLine, so the compound key always has two parts.
            const [vendorName, vendorSlug] = key.split("|") as [string, string];

            return (
              <section
                key={key}
                aria-label={t("cart.objectsFrom", { studio: vendorName })}
                className="rounded-xl border border-border bg-surface"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
                  <div>
                    <p className="eyebrow text-muted-foreground">{t("products.studio")}</p>
                    <p className="mt-1 font-display text-lg font-medium tracking-[-0.02em]">
                      {vendorName}
                    </p>
                  </div>
                  <Link
                    href={`/vendors/${vendorSlug}`}
                    className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                  >
                    {t("common.visitStudio")}
                  </Link>
                </div>
                <ul className="divide-y divide-border">
                  {lines.map((line) => {
                    const problem = problemText(line, t);

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
                              height={line.image?.height ?? 1024}
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
                                    {problem}. {t("cart.problemAction")}
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
              {t("cart.clear")}
            </Button>
          </form>
        </div>

        <aside className="rounded-xl border border-border bg-surface p-6">
          <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
            {t("cart.summaryHeading")}
          </h2>
          <dl className="mt-5 space-y-3 border-b border-border pb-5 text-sm">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{t("common.subtotal")}</dt>
              <dd className="font-medium tabular-nums">
                {formatMoney(view.subtotalCents, view.currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{t("common.shipping")}</dt>
              <dd className="text-muted-foreground">{t("common.notCalculated")}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-muted-foreground">{t("common.tax")}</dt>
              <dd className="text-muted-foreground">{t("common.notCalculated")}</dd>
            </div>
          </dl>
          <div className="mt-5 flex items-baseline justify-between gap-4">
            <p className="font-medium">{t("common.total")}</p>
            <p className="font-display text-2xl font-medium tracking-[-0.02em] tabular-nums">
              {formatMoney(view.subtotalCents, view.currency)}
            </p>
          </div>

          <div className="mt-6">
            {!actor ? (
              <Button asChild className="w-full">
                <Link href="/sign-in?next=%2Fcheckout">{t("cart.signInToCheckout")}</Link>
              </Button>
            ) : !canCheckout(actor) ? (
              <p className="rounded-md border border-border bg-surface-muted px-3.5 py-3 text-xs leading-5 text-muted-foreground">
                {t("cart.onlyCustomers")}
              </p>
            ) : view.canCheckout ? (
              <Button asChild className="w-full">
                <Link href="/checkout">{t("common.continueCheckout")}</Link>
              </Button>
            ) : (
              <Button disabled className="w-full">
                {t("cart.resolveIssues")}
              </Button>
            )}
          </div>

          <p className="mt-4 text-xs leading-5 text-muted-foreground">{t("cart.phaseNote")}</p>
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
