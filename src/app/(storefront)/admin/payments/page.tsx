import type { Metadata } from "next";
import { Link2, ReceiptText } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PaymentStatusBadge, RefundStatusBadge } from "@/components/payments/payment-status-badge";
import { RefundForm } from "@/components/payments/refund-form";
import { PageShell } from "@/components/storefront/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/features/catalog/money";
import { paymentMethodLabel } from "@/features/payments/methods";
import { listPaymentReconciliation } from "@/features/payments/queries";
import { formatDateTime } from "@/lib/utils/format-date";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Payments and reconciliation",
  description: "Reconcile LynxPay settlements, refunds, and commission ledger entries.",
  robots: { index: false, follow: false },
};

export default function AdminPaymentsPage() {
  return (
    <Suspense fallback={<AdminPaymentsSkeleton />}>
      <AdminPaymentsContent />
    </Suspense>
  );
}

async function AdminPaymentsContent() {
  const admin = await requireAdmin();
  const report = await listPaymentReconciliation();
  const { totals, rows } = report;
  const currency = rows[0]?.currency ?? "TZS";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Administration</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Payments and reconciliation.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Every confirmed LynxPay payment is checked against its order total and the commission
            ledger. Refunds reverse vendor earnings and platform commission in the same ratio.
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Signed in as {admin.name}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 lg:gap-x-10">
          <div>
            <dt className="eyebrow text-muted-foreground">Confirmed</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{totals.successfulPayments}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Merchant net</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(totals.netCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Flagged</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{totals.flaggedPayments}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Customer paid" value={formatMoney(totals.grossCents, currency)} />
        <SummaryCard label="Provider fees" value={formatMoney(totals.feeCents, currency)} />
        <SummaryCard label="Refunded" value={formatMoney(totals.refundedCents, currency)} />
        <SummaryCard
          label="Ledger net"
          value={formatMoney(totals.ledgerNetCents, currency)}
          detail={`${formatMoney(totals.vendorEarningCents, currency)} studios · ${formatMoney(totals.platformCommissionCents, currency)} platform`}
        />
      </div>

      {totals.reconciled ? (
        <Notice tone="success" className="mt-6">
          Ledger net matches provider net after refunds. Financial totals reconcile.
        </Notice>
      ) : (
        <Notice tone="danger" className="mt-6">
          Ledger net {formatMoney(totals.ledgerNetCents, currency)} does not match provider net
          after refunds {formatMoney(totals.netCents - totals.refundedCents, currency)}. Review the
          flagged payments below.
        </Notice>
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={<ReceiptText className="size-5" aria-hidden="true" />}
          title="No payments yet."
          description="Once a customer starts a LynxPay payment, every attempt and its reconciliation state appears here."
          className="mt-8"
        />
      ) : (
        <ul className="mt-8 space-y-5">
          {rows.map((payment) => {
            const remainingRefundable =
              payment.netCents - payment.refundedCents - payment.pendingRefundCents;
            const canRefund =
              (payment.status === "SUCCEEDED" || payment.status === "PARTIALLY_REFUNDED") &&
              remainingRefundable > 0;

            return (
              <li key={payment.id}>
                <article className="rounded-xl border border-border bg-surface p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/orders/${payment.orderNumber}`}
                          className="font-mono text-sm font-medium tracking-[0.04em] underline-offset-4 hover:underline"
                        >
                          {payment.orderNumber}
                        </Link>
                        <PaymentStatusBadge status={payment.status} />
                        <span className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
                          Attempt {payment.attempt}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {paymentMethodLabel(payment.method)} · started{" "}
                        {formatDateTime(payment.initiatedAt)}
                        {payment.completedAt
                          ? ` · confirmed ${formatDateTime(payment.completedAt)}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Order status: {payment.orderStatus.replaceAll("_", " ").toLowerCase()}
                    </p>
                  </div>

                  <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 text-sm sm:grid-cols-3 lg:grid-cols-6">
                    <Amount
                      label="Order total"
                      cents={payment.orderTotalCents}
                      currency={currency}
                    />
                    <Amount label="Customer paid" cents={payment.grossCents} currency={currency} />
                    <Amount label="Provider fee" cents={payment.feeCents} currency={currency} />
                    <Amount label="Merchant net" cents={payment.netCents} currency={currency} />
                    <Amount label="Refunded" cents={payment.refundedCents} currency={currency} />
                    <Amount label="Ledger net" cents={payment.ledgerNetCents} currency={currency} />
                  </dl>

                  {payment.failureMessage ? (
                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      <span className="text-danger">Provider message: </span>
                      {payment.failureMessage}
                    </p>
                  ) : null}

                  {payment.issues.length > 0 ? (
                    <div className="mt-4 rounded-md border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-sm leading-5 text-danger">
                      <p className="font-medium">Not reconciled</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        {payment.issues.map((issue) => (
                          <li key={issue}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {payment.refunds.length > 0 ? (
                    <div className="mt-5 border-t border-border pt-4">
                      <p className="eyebrow text-muted-foreground">Refunds</p>
                      <ul className="mt-2 space-y-2 text-sm">
                        {payment.refunds.map((refund) => (
                          <li
                            key={refund.id}
                            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground"
                          >
                            <RefundStatusBadge status={refund.status} />
                            <span className="font-medium text-foreground tabular-nums">
                              {formatMoney(refund.amountCents, currency)}
                            </span>
                            <span>{refund.reason}</span>
                            <span className="text-xs">{formatDateTime(refund.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {canRefund ? (
                    <RefundForm
                      orderNumber={payment.orderNumber}
                      paymentId={payment.id}
                      remainingCents={remainingRefundable}
                      currency={currency}
                    />
                  ) : null}

                  {payment.pendingRefundCents > 0 ? (
                    <p className="mt-4 text-xs text-muted-foreground">
                      {formatMoney(payment.pendingRefundCents, currency)} is awaiting provider
                      confirmation.
                    </p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-8 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
        <Link2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        Reconciliation compares provider gross, fee, and net amounts with the order total and the
        immutable commission ledger. It never edits ledger entries; corrective actions are new
        refunds or payout adjustments.
      </p>
    </PageShell>
  );
}

function Amount({ label, cents, currency }: { label: string; cents: number; currency: string }) {
  return (
    <div>
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium tabular-nums">{formatMoney(cents, currency)}</dd>
    </div>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="eyebrow text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl font-medium tabular-nums">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

function AdminPaymentsSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading payment reconciliation">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-96 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <div className="mt-6 space-y-5">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
