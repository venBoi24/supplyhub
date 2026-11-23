import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { formatMoney } from "@/features/catalog/money";
import { getVendorEarnings } from "@/features/payments/vendor-queries";
import { formatDate } from "@/lib/utils/format-date";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getServerI18n } from "@/i18n/server";
import type { PayoutStatus } from "@/generated/prisma/enums";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.earningsTitle"),
    robots: { index: false, follow: false },
  };
}

const PAYOUT_STATUS_KEYS: Record<PayoutStatus, string> = {
  PENDING: "payments.status.pending",
  APPROVED: "payments.status.approved",
  PROCESSING: "payments.status.processing",
  PAID: "payments.status.paymentPaid",
  RECONCILED: "payments.status.reconciled",
  FAILED: "payments.status.paymentFailed",
};

export default function VendorEarningsPage() {
  return (
    <Suspense fallback={<EarningsSkeleton />}>
      <VendorEarningsContent />
    </Suspense>
  );
}

async function VendorEarningsContent() {
  const [{ t }, { vendorId }] = await Promise.all([
    getServerI18n(),
    requireApprovedVendor("/vendor/earnings"),
  ]);
  const earnings = await getVendorEarnings(vendorId);
  const metrics = [
    { label: t("studio.recordedEarnings"), value: earnings.earningsCents },
    { label: t("studio.reservedForPayouts"), value: earnings.reservedCents },
    { label: t("studio.paidOut"), value: earnings.paidCents },
    { label: t("studio.available"), value: earnings.availableCents },
  ];

  return (
    <>
      <StudioPageHead
        title={t("studio.earnings")}
        description={t("studio.earningsIntro", { currency: earnings.currency })}
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
          {t("studio.payoutHistory")}
        </h2>
        {earnings.payouts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground">
            {t("studio.noPayouts")}
          </p>
        ) : (
          <>
            {/* Phones: stacked rows that wrap in place — no horizontal scrolling. */}
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface sm:hidden">
              {earnings.payouts.map((payout) => (
                <li key={payout.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-mono text-xs break-all">
                      {payout.reference ?? t("studio.pendingReference")}
                    </span>
                    <span className="shrink-0 text-xs">{t(PAYOUT_STATUS_KEYS[payout.status])}</span>
                  </div>
                  <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
                    <span className="min-w-0 break-words text-muted-foreground">
                      {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      {formatMoney(payout.amountCents, payout.currency)}
                    </span>
                  </div>
                  <p className="mt-1 text-[0.6563rem] text-muted-foreground">
                    {t("studio.updatedLabel", {
                      date: formatDate(payout.reconciledAt ?? payout.paidAt ?? payout.createdAt),
                    })}
                  </p>
                </li>
              ))}
            </ul>
            <div className="scroll-x mt-3 hidden rounded-xl border border-border bg-surface sm:block">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-surface-muted/60">
                  <tr>
                    {[
                      t("studio.payoutReference"),
                      t("studio.payoutPeriod"),
                      t("common.total"),
                      t("common.status"),
                      t("studio.updatedColumn"),
                    ].map((heading) => (
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
                        {payout.reference ?? t("studio.pendingReference")}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs tabular-nums">
                        {formatMoney(payout.amountCents, payout.currency)}
                      </td>
                      <td className="px-4 py-3 text-xs">{t(PAYOUT_STATUS_KEYS[payout.status])}</td>
                      <td className="px-4 py-3 text-xs">
                        {formatDate(payout.reconciledAt ?? payout.paidAt ?? payout.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </>
  );
}

async function EarningsSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingEarnings")}>
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
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
