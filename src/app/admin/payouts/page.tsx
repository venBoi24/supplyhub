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
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.payoutsMetaTitle"),
    description: t("admin.payoutsMetaDescription"),
    robots: { index: false, follow: false },
  };
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export default async function AdminPayoutsPage() {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<AdminPayoutsSkeleton loadingLabel={t("common.loading")} />}>
      <AdminPayoutsContent />
    </Suspense>
  );
}

async function AdminPayoutsContent() {
  const { t, formatDate, formatTime } = await getServerI18n();
  const admin = await requireAdmin();
  const overview = await listPayoutOverview();
  const currency = overview.payouts[0]?.currency ?? "TZS";
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {t("admin.studioPayouts")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("admin.payoutsIntro")}
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            {t("admin.signedInAs", { name: admin.name })}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm sm:grid-cols-4 lg:grid-cols-2 lg:gap-x-10 xl:grid-cols-4">
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.payoutEarned")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.vendorEarningsCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.payoutReserved")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.reservedCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.payoutPaidOut")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.paidOutCents, currency)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.payoutAvailable")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium tabular-nums">
              {formatMoney(overview.totals.availableCents, currency)}
            </dd>
          </div>
        </dl>
      </div>

      <Notice tone="info" className="mt-8">
        {t("admin.payoutsManualNotice")}
      </Notice>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-labelledby="vendor-balances" className="min-w-0">
          <h2 id="vendor-balances" className="font-display text-2xl font-medium tracking-[-0.02em]">
            {t("admin.studioBalances")}
          </h2>
          {overview.vendors.length === 0 ? (
            <EmptyState
              icon={<Wallet className="size-5" aria-hidden="true" />}
              title={t("admin.balancesEmptyTitle")}
              description={t("admin.balancesEmptyBody")}
              className="mt-4"
            />
          ) : (
            <>
              <ul className="mt-4 space-y-3 sm:hidden">
                {overview.vendors.map((vendor) => (
                  <li key={vendor.id} className="rounded-xl border border-border bg-surface p-4">
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/vendors/${vendor.slug}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {vendor.name}
                      </Link>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="eyebrow text-muted-foreground">{t("admin.payoutEarned")}</dt>
                        <dd className="mt-1 tabular-nums">
                          {formatMoney(vendor.earningsCents, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-muted-foreground">
                          {t("admin.payoutReserved")}
                        </dt>
                        <dd className="mt-1 tabular-nums">
                          {formatMoney(vendor.reservedCents, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-muted-foreground">
                          {t("admin.payoutPaidOut")}
                        </dt>
                        <dd className="mt-1 tabular-nums">
                          {formatMoney(vendor.paidOutCents, currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="eyebrow text-muted-foreground">
                          {t("admin.payoutAvailable")}
                        </dt>
                        <dd className="mt-1 font-medium tabular-nums">
                          {formatMoney(vendor.availableCents, currency)}
                        </dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ul>
              <div className="mt-4 hidden rounded-xl border border-border bg-surface sm:block">
                <table className="w-full table-fixed text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th scope="col" className="px-5 py-3 font-medium">
                        {t("products.studio")}
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        {t("admin.payoutEarned")}
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        {t("admin.payoutReserved")}
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        {t("admin.payoutPaidOut")}
                      </th>
                      <th scope="col" className="px-5 py-3 text-right font-medium">
                        {t("admin.payoutAvailable")}
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
            </>
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
          {t("admin.payoutRecords")}
        </h2>

        {overview.payouts.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-5" aria-hidden="true" />}
            title={t("admin.payoutsEmptyTitle")}
            description={t("admin.payoutsEmptyBody")}
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
                      <dt className="inline text-muted-foreground">
                        {t("admin.payoutPeriodLabel")}{" "}
                      </dt>
                      <dd className="inline font-medium">
                        {formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}
                      </dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">
                        {t("admin.payoutRecordedLabel")}{" "}
                      </dt>
                      <dd className="inline font-medium">{formatDate(payout.createdAt)}</dd>
                    </div>
                    {payout.paidAt ? (
                      <div>
                        <dt className="inline text-muted-foreground">
                          {t("checkout.status.paid")}{" "}
                        </dt>
                        <dd className="inline font-medium">
                          {formatDate(payout.paidAt)} · {formatTime(payout.paidAt)}
                        </dd>
                      </div>
                    ) : null}
                    {payout.reconciledAt ? (
                      <div>
                        <dt className="inline text-muted-foreground">
                          {t("admin.payoutReconciledLabel")}{" "}
                        </dt>
                        <dd className="inline font-medium">
                          {formatDate(payout.reconciledAt)} · {formatTime(payout.reconciledAt)}
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

function AdminPayoutsSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={loadingLabel}>
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
      <span className="sr-only">{loadingLabel}</span>
    </PageShell>
  );
}

export const instant = false;
