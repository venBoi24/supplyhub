import type { Metadata } from "next";
import { ArrowLeft, Box, CreditCard, MapPin, Navigation } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { OrderStatusPill } from "@/components/vendor/order-status-pill";
import { PaymentPanel } from "@/components/payments/payment-panel";
import { PageShell } from "@/components/storefront/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/features/catalog/money";
import { getOrderForViewer } from "@/features/checkout/queries";
import { paymentMethodLabel } from "@/features/payments/methods";
import {
  getOrderPaymentView,
  type CustomerPaymentView,
  type CustomerRefundView,
  type OrderPaymentView,
} from "@/features/payments/queries";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  REFUND_STATUS_LABELS,
} from "@/features/payments/status";
import { getServerI18n, type ServerI18n } from "@/i18n/server";
import { requireActor } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("orders.detailMetaTitle"),
    description: t("orders.detailMetaDescription"),
    robots: { index: false, follow: false },
  };
}

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function OrderPage({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      <OrderContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderContent({
  params,
  searchParams,
}: {
  params: PageProps<"/orders/[orderNumber]">["params"];
  searchParams: PageProps<"/orders/[orderNumber]">["searchParams"];
}) {
  const [{ t, formatDate }, { orderNumber }, query] = await Promise.all([
    getServerI18n(),
    params,
    searchParams,
  ]);
  const actor = await requireActor(`/orders/${orderNumber}`);
  const [order, paymentView] = await Promise.all([
    getOrderForViewer(actor, orderNumber),
    getOrderPaymentView(actor, orderNumber),
  ]);

  if (!order) {
    notFound();
  }

  const placed = searchParamValue(query.placed) === "1";
  const paymentReturned = searchParamValue(query.payment) === "return";
  const latestPayment = paymentView?.latestPayment ?? null;

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/account/orders"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("orders.allOrders")}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-8">
        <div className="min-w-0">
          <p className="eyebrow text-muted-foreground">{t("orders.orderEyebrow")}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
              {order.orderNumber}
            </h1>
            <OrderStatusPill status={order.status} />
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("orders.placedAtLine", {
              date: formatDate(order.placedAt),
              studios: t("common.studioCount", {
                count: order.vendorOrders.length,
                studios: t(
                  order.vendorOrders.length === 1 ? "common.studioOne" : "common.studioMany",
                ),
              }),
            })}
          </p>
        </div>
        <p className="font-display text-3xl font-medium tracking-[-0.02em] tabular-nums">
          {formatMoney(order.totalCents, order.currency)}
        </p>
      </div>

      <div className="mt-6 space-y-3">
        {placed ? (
          <Notice tone="success">
            {order.reservationExpiresAt
              ? t("orders.noticePlacedWithExpiry", {
                  until: formatDate(order.reservationExpiresAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("orders.noticePlaced")}
          </Notice>
        ) : null}
        {order.status === "AWAITING_PAYMENT" && paymentView && !paymentView.canPay ? (
          <Notice tone="warning">{t("orders.noticePaymentUnavailable")}</Notice>
        ) : null}
        {order.status === "PAID" ? (
          <Notice tone="success">
            {latestPayment?.completedAt
              ? t("orders.noticePaidWithTime", {
                  time: formatDate(latestPayment.completedAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })
              : t("orders.noticePaid")}
          </Notice>
        ) : null}
        {order.status === "EXPIRED" ? (
          <Notice tone="warning">{t("orders.noticeExpired")}</Notice>
        ) : null}
        {order.status === "CANCELLED" ? (
          <Notice tone="danger">{t("orders.noticeCancelled")}</Notice>
        ) : null}
      </div>

      {order.status === "AWAITING_PAYMENT" && paymentView ? (
        <div className="mt-8">
          <PaymentPanel
            orderNumber={order.orderNumber}
            totalCents={order.totalCents}
            currency={order.currency}
            latestPayment={latestPayment}
            canPay={paymentView.canPay}
            defaultPhone={order.address.contactPhone}
            reservationExpiresAt={order.reservationExpiresAt}
            paymentReturned={paymentReturned}
          />
        </div>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
        <div className="space-y-6">
          {order.vendorOrders.map((vendorOrder) => (
            <section
              key={vendorOrder.id}
              aria-labelledby={`vendor-${vendorOrder.id}`}
              className="rounded-xl border border-border bg-surface"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
                <div>
                  <p className="eyebrow text-muted-foreground">{t("orders.studioOrderEyebrow")}</p>
                  <h2
                    id={`vendor-${vendorOrder.id}`}
                    className="mt-1 font-display text-lg font-medium tracking-[-0.02em]"
                  >
                    <Link
                      href={`/vendors/${vendorOrder.vendorSlug}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {vendorOrder.vendorName}
                    </Link>
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusPill status={vendorOrder.status} />
                  <p className="text-sm font-medium tabular-nums">
                    {formatMoney(vendorOrder.subtotalCents, order.currency)}
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {vendorOrder.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
                      {item.imageSrc ? (
                        <Image
                          src={item.imageSrc}
                          alt={item.productName}
                          width={1024}
                          height={1024}
                          sizes="64px"
                          className="size-full object-cover"
                        />
                      ) : (
                        <Box
                          className="absolute inset-0 m-auto size-5 text-muted-foreground"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.productSlug}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {item.productName}
                      </Link>
                      <p className="mt-0.5 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                        {item.sku} · {item.quantity} ×{" "}
                        {formatMoney(item.unitPriceCents, item.currency)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-medium tabular-nums">
                      {formatMoney(item.lineTotalCents, item.currency)}
                    </p>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground sm:px-6">
                {t("orders.deliveredByNote", { studio: vendorOrder.vendorName })}
              </p>
            </section>
          ))}
        </div>

        <aside className="space-y-6">
          {latestPayment && order.status !== "AWAITING_PAYMENT" ? (
            <PaymentSummary
              latestPayment={latestPayment}
              paymentView={paymentView}
              i18n={{ t, formatDate }}
            />
          ) : null}

          <section className="rounded-xl border border-border bg-surface p-6">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-muted-foreground" aria-hidden="true" />
              <h2 className="font-display text-lg font-medium tracking-[-0.02em]">
                {t("orders.deliveryHeading")}
              </h2>
            </div>
            <address className="mt-4 space-y-0.5 text-sm leading-6 not-italic">
              <p className="font-medium">{order.address.recipientName}</p>
              <p>{order.address.addressLine1}</p>
              {order.address.addressLine2 ? <p>{order.address.addressLine2}</p> : null}
              <p>
                {order.address.city}, {order.address.region} {order.address.postalCode}
              </p>
              <p>{order.address.countryCode}</p>
              <p className="pt-2 text-muted-foreground">{order.address.contactEmail}</p>
              {order.address.contactPhone ? (
                <p className="text-muted-foreground">{order.address.contactPhone}</p>
              ) : null}
            </address>
            <Button asChild variant="secondary" className="mt-5 w-full">
              <Link href="/delivery-live?persona=buyer">
                <Navigation className="size-4" aria-hidden="true" />
                {t("orders.trackLiveDelivery")}
              </Link>
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-medium tracking-[-0.02em]">
              {t("orders.totalsHeading")}
            </h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("common.subtotal")}</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotalCents, order.currency)}</dd>
              </div>
              {order.discountTotalCents > 0 ? (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-muted-foreground">{t("orders.discountLabel")}</dt>
                  <dd className="tabular-nums">
                    −{formatMoney(order.discountTotalCents, order.currency)}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("common.shipping")}</dt>
                <dd className="text-muted-foreground">
                  {order.shippingTotalCents > 0
                    ? formatMoney(order.shippingTotalCents, order.currency)
                    : t("common.notCalculated")}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("common.tax")}</dt>
                <dd className="text-muted-foreground">
                  {order.taxTotalCents > 0
                    ? formatMoney(order.taxTotalCents, order.currency)
                    : t("common.notCalculated")}
                </dd>
              </div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-4">
              <p className="font-medium">{t("common.total")}</p>
              <p className="font-display text-2xl font-medium tracking-[-0.02em] tabular-nums">
                {formatMoney(order.totalCents, order.currency)}
              </p>
            </div>
          </section>

          <div className="flex flex-col gap-2">
            <Button asChild variant="secondary">
              <Link href="/account/orders">{t("orders.viewAllOrders")}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/products">{t("orders.continueBrowsing")}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

async function PaymentSummary({
  latestPayment,
  paymentView,
  i18n,
}: {
  latestPayment: CustomerPaymentView;
  paymentView: OrderPaymentView | null;
  i18n: Pick<ServerI18n, "t" | "formatDate">;
}) {
  const { t, formatDate } = i18n;

  return (
    <section className="rounded-xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-display text-lg font-medium tracking-[-0.02em]">
            {t("orders.paymentHeading")}
          </h2>
        </div>
        <Badge tone={PAYMENT_STATUS_TONES[latestPayment.status]}>
          {PAYMENT_STATUS_LABELS[latestPayment.status]}
        </Badge>
      </div>
      <dl className="mt-4 space-y-3 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{t("orders.methodLabel")}</dt>
          <dd>{paymentMethodLabel(latestPayment.method)}</dd>
        </div>
        {latestPayment.completedAt ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t("orders.confirmedLabel")}</dt>
            <dd>
              {formatDate(latestPayment.completedAt, { dateStyle: "medium", timeStyle: "short" })}
            </dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{t("orders.merchantTotalLabel")}</dt>
          <dd className="tabular-nums">
            {formatMoney(latestPayment.netCents, latestPayment.currency)}
          </dd>
        </div>
        {latestPayment.feeCents > 0 ? (
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-muted-foreground">{t("orders.customerFeeLabel")}</dt>
            <dd className="tabular-nums">
              {formatMoney(latestPayment.feeCents, latestPayment.currency)}
            </dd>
          </div>
        ) : null}
        {latestPayment.providerReference ? (
          <div className="border-t border-border pt-3">
            <dt className="eyebrow text-muted-foreground">{t("orders.providerReferenceLabel")}</dt>
            <dd className="mt-1 font-mono text-xs break-all">{latestPayment.providerReference}</dd>
          </div>
        ) : null}
      </dl>

      {paymentView && paymentView.refundedCents > 0 ? (
        <p className="mt-4 border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">{t("orders.refundedLabel")}</span>
          <span className="font-medium tabular-nums">
            {formatMoney(paymentView.refundedCents, latestPayment.currency)}
          </span>
        </p>
      ) : null}

      {paymentView && paymentView.refunds.length > 0 ? (
        <div className="mt-4 border-t border-border pt-3">
          <p className="eyebrow text-muted-foreground">{t("orders.refundHistoryLabel")}</p>
          <ul className="mt-2 space-y-2 text-xs leading-5">
            {paymentView.refunds.map((refund) => (
              <RefundRow
                key={refund.id}
                refund={refund}
                currency={latestPayment.currency}
                formatDate={formatDate}
              />
            ))}
          </ul>
        </div>
      ) : null}

      {latestPayment.failureMessage &&
      (latestPayment.status === "DISPUTED" || latestPayment.status === "FAILED") ? (
        <Notice tone="danger" className="mt-4">
          {latestPayment.failureMessage}
        </Notice>
      ) : null}
    </section>
  );
}

async function OrderSkeleton() {
  const { t } = await getServerI18n();
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={t("orders.loadingOrder")}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </PageShell>
  );
}

function RefundRow({
  refund,
  currency,
  formatDate,
}: {
  refund: CustomerRefundView;
  currency: string;
  formatDate: ServerI18n["formatDate"];
}) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="min-w-0 text-muted-foreground">
        {refund.reason} · {REFUND_STATUS_LABELS[refund.status]} · {formatDate(refund.createdAt)}
      </span>
      <span className="shrink-0 tabular-nums">{formatMoney(refund.amountCents, currency)}</span>
    </li>
  );
}

export const instant = false;
