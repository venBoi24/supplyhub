import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { formatMoney } from "@/features/catalog/money";
import { getVendorEarnings } from "@/features/payments/vendor-queries";
import { formatDate } from "@/lib/utils/format-date";
import { requireApprovedVendor } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Studio earnings",
  robots: { index: false, follow: false },
};

export default function VendorEarningsPage() {
  return (
    <Suspense fallback={<EarningsSkeleton />}>
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
    <>
      <StudioPageHead
        title="Earnings"
        description={`Earnings come from the immutable commission ledger. Figures use ${earnings.currency}; manual payout records do not imply an automatic transfer.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-border bg-surface p-4">
            <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
              {metric.label}
            </p>
            <p className="mt-2 font-display text-[1.5rem] leading-none font-semibold tracking-[-0.03em]">
              {formatMoney(metric.value, earnings.currency)}
            </p>
          </div>
        ))}
      </div>

      <section aria-labelledby="payout-history-title" className="mt-6">
        <h2
          id="payout-history-title"
          className="font-display text-lg font-semibold tracking-[-0.02em]"
        >
          Payout history
        </h2>
        {earnings.payouts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            No payout records yet.
          </p>
        ) : (
          <div className="scroll-x mt-3 rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-surface-muted/60">
                <tr>
                  {["Reference", "Period", "Amount", "Status", "Updated"].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-2.5 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {earnings.payouts.map((payout) => (
                  <tr key={payout.id}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {payout.reference ?? "Pending reference"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs tabular-nums">
                      {formatMoney(payout.amountCents, payout.currency)}
                    </td>
                    <td className="px-4 py-3 text-xs">{payout.status}</td>
                    <td className="px-4 py-3 text-xs">
                      {formatDate(payout.reconciledAt ?? payout.paidAt ?? payout.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function EarningsSkeleton() {
  return (
    <div role="status" aria-label="Loading earnings">
      <div className="mb-5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
