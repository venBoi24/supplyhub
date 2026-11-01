import type { Metadata } from "next";
import { Banknote, Wallet } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PayoutActions } from "@/components/payments/payout-actions";
import { PayoutCreateForm } from "@/components/payments/payout-create-form";
import { PayoutStatusBadge } from "@/components/payments/payment-status-badge";
import { PageShell } from "@/components/storefront/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/features/catalog/money";
import { listPayoutOverview } from "@/features/payments/queries";
import { formatDate, formatDateTime } from "@/lib/utils/format-date";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Studio payouts",
  description: "Track studio balances, record payouts, and reconcile transfers.",
  robots: { index: false, follow: false },
};

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default function AdminPayoutsPage() {
  return (
    <Suspense fallback={<AdminPayoutsSkeleton />}>
      <AdminPayoutsContent />
    </Suspense>
  );
}

async function AdminPayoutsContent() {
  const admin = await requireAdmin();
  const overview = await listPayoutOverview();
  const currency = overview.payouts[0]?.currency ?? "TZS";
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Administration</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Studio payouts.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Vendor earnings come from the commission ledger, never from order totals typed by hand.
            Recording a payout reserves that balance until the transfer is marked paid and
            reconciled.
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Signed in as {admin.name}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-10 xl:grid-cols-4">
          <div>
            <dt className="eyebrow text-muted-foreground">Earned</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.vendorEarningsCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Reserved</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.reservedCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Paid out</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.paidOutCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Available</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.availableCents, currency)}
            </dd>
          </div>
        </dl>
      </div>

      <Notice tone="info" className="mt-8">
        Payouts are recorded manually in this phase. LynxPay does not expose a payout API for this
        account, so transfers are made outside the platform and reconciled here.
      </Notice>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="vendor-balances">
          <h2 id="vendor-balances" className="font-display text-2xl font-medium tracking-[-0.02em]">
            Studio balances
          </h2>
          {overview.vendors.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-5" aria-hidden="true" />}
              title="No approved studios yet."
              description="Approve a studio application before payouts can be recorded."
              className="mt-4"
            />
          ) : (
            <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">
                      Studio
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Earned
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Reserved
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Paid out
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Available
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overview.vendors.map((vendor) => (
                    <tr key={vendor.id} className="border-b border-border last:border-b-0">
                      <th scope="row" className="px-5 py-3.5 font-medium">
                        <Link
                          href={`/vendors/${vendor.slug}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {vendor.name}
                        </Link>
                      </th>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {formatMoney(vendor.earningsCents, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {formatMoney(vendor.reservedCents, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        {formatMoney(vendor.paidOutCents, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums">
                        {formatMoney(vendor.availableCents, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <PayoutCreateForm
          vendors={overview.vendors.map((vendor) => ({
            id: vendor.id,
            name: vendor.name,
            availableCents: vendor.availableCents,
          }))}
          currency={currency}
          defaultPeriodStart={isoDay(periodStart)}
          defaultPeriodEnd={isoDay(now)}
        />
      </div>

      <section aria-labelledby="payout-history" className="mt-10">
        <h2 id="payout-history" className="font-display text-2xl font-medium tracking-[-0.02em]">
          Payout records
        </h2>

        {overview.payouts.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-5" aria-hidden="true" />}
            title="No payouts recorded."
            description="Record a payout to reserve a studio balance and start the manual reconciliation trail."
            className="mt-4"
          />
        ) : (
          <ul className="mt-4 space-y-4">
            {overview.payouts.map((payout) => (
              <li key={payout.id}>
                <article className="rounded-xl border border-border bg-surface p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-display text-xl font-medium tracking-[-0.02em]">
                          {payout.vendorName}
                        </h3>
                        <PayoutStatusBadge status={payout.status} />
                      </div>
                      <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                        {payout.reference ?? payout.id}
                      </p>
                    </div>
                    <p className="font-display text-2xl font-medium tabular-nums">
                      {formatMoney(payout.amountCents, payout.currency)}
                    </p>
                  </div>

                  <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="inline text-muted-foreground">Period </dt>
                      <dd className="inline font-medium">
                        {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">Recorded </dt>
                      <dd className="inline font-medium">{formatDate(payout.createdAt)}</dd>
                    </div>
                    {payout.paidAt ? (
                      <div>
                        <dt className="inline text-muted-foreground">Paid </dt>
                        <dd className="inline font-medium">{formatDateTime(payout.paidAt)}</dd>
                      </div>
                    ) : null}
                    {payout.reconciledAt ? (
                      <div>
                        <dt className="inline text-muted-foreground">Reconciled </dt>
                        <dd className="inline font-medium">
                          {formatDateTime(payout.reconciledAt)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {payout.note ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{payout.note}</p>
                  ) : null}

                  <PayoutActions payoutId={payout.id} status={payout.status} />
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}

function AdminPayoutsSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading studio payouts">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
