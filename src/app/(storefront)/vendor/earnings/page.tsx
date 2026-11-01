import type { Metadata } from "next";
import { Suspense } from "react";

import { StudioNav } from "@/components/vendor/studio-nav";
import { PageShell } from "@/components/storefront/page-shell";
import { formatMoney } from "@/features/catalog/money";
import { getVendorEarnings } from "@/features/payments/vendor-queries";
import { requireApprovedVendor } from "@/server/auth/guards";
import { formatDate } from "@/lib/utils/format-date";

export const metadata: Metadata = {
  title: "Studio earnings",
  robots: { index: false, follow: false },
};

export default function VendorEarningsPage() {
  return (
    <Suspense fallback={<PageShell className="pt-12">Loading earnings…</PageShell>}>
      <VendorEarningsContent />
    </Suspense>
  );
}

async function VendorEarningsContent() {
  const { vendorId } = await requireApprovedVendor("/vendor/earnings");
  const earnings = await getVendorEarnings(vendorId);
  const metrics = [
    { label: "Recorded earnings", value: earnings.earningsCents },
    { label: "Reserved for payouts", value: earnings.reservedCents },
    { label: "Paid out", value: earnings.paidCents },
    { label: "Available", value: earnings.availableCents },
  ];

  return (
    <PageShell className="pt-10 sm:pt-14">
      <p className="eyebrow text-muted-foreground">Studio workspace</p>
      <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] sm:text-5xl">
        Earnings and payouts.
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        Earnings come from the immutable commission ledger. Available balance subtracts pending,
        approved, processing, paid, and reconciled payouts. Figures use {earnings.currency}; manual
        payout records do not imply an automatic transfer.
      </p>
      <div className="mt-6">
        <StudioNav />
      </div>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface p-5">
            <dt className="eyebrow text-muted-foreground">{metric.label}</dt>
            <dd className="mt-2 font-display text-2xl font-medium">
              {formatMoney(metric.value, earnings.currency)}
            </dd>
          </div>
        ))}
      </dl>
      <section className="mt-10" aria-labelledby="payout-history-title">
        <h2 id="payout-history-title" className="font-display text-2xl font-medium">
          Payout history
        </h2>
        {earnings.payouts.length === 0 ? (
          <p className="mt-4 rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            No payout records yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-surface-muted text-xs text-muted-foreground">
                <tr>
                  <th className="p-4">Reference</th>
                  <th className="p-4">Period</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {earnings.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="p-4 font-mono text-xs">
                      {payout.reference ?? "Pending reference"}
                    </td>
                    <td className="p-4">
                      {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                    </td>
                    <td className="p-4">{formatMoney(payout.amountCents, payout.currency)}</td>
                    <td className="p-4">{payout.status}</td>
                    <td className="p-4">
                      {formatDate(payout.reconciledAt ?? payout.paidAt ?? payout.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
