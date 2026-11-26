import type { Metadata } from "next";
import { Store } from "lucide-react";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorReviewActions } from "@/components/vendors/vendor-review-actions";
import { VendorAppealReviewActions } from "@/components/vendors/vendor-appeal-review-actions";
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import { listVendorApplications } from "@/features/vendors/queries";
import type { VendorStatus } from "@/generated/prisma/enums";
import { parseEnumParam, parseSearchTerm, searchParamValue } from "@/features/admin/filters";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.vendorsMetaTitle"),
    description: t("admin.vendorsMetaDescription"),
    robots: { index: false, follow: false },
  };
}

const statuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const satisfies readonly VendorStatus[];

const statusLabelKeys: Record<VendorStatus, string> = {
  PENDING: "admin.pending",
  APPROVED: "vendor.approved",
  REJECTED: "admin.rejected",
  SUSPENDED: "admin.suspended",
};

export default async function AdminVendorsPage({ searchParams }: PageProps<"/admin/vendors">) {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<AdminSkeleton loadingLabel={t("common.loading")} />}>
      <AdminVendorsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminVendorsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/vendors">["searchParams"];
}) {
  const { t, formatDate, formatNumber } = await getServerI18n();
  const admin = await requireAdmin();
  const params = await searchParams;
  const status = parseEnumParam(params.status, statuses);
  const search = parseSearchTerm(params.q);
  const page = parsePage(searchParamValue(params.page));
  const {
    applications,
    counts,
    total,
    page: currentPage,
  } = await listVendorApplications({ page, status, search });

  const reviewed = searchParamValue(params.reviewed);
  const pendingCount = counts.PENDING;

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {t("admin.vendorsTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("admin.vendorsIntro")}
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            {t("admin.signedInAs", { name: admin.name })}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4 lg:gap-x-10">
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.pending")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium">
              {formatNumber(counts.PENDING)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("vendor.approved")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium">
              {formatNumber(counts.APPROVED)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.rejected")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium">
              {formatNumber(counts.REJECTED)}
            </dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">{t("admin.suspended")}</dt>
            <dd className="mt-1 font-display text-2xl font-medium">
              {formatNumber(counts.SUSPENDED)}
            </dd>
          </div>
        </dl>
      </div>

      {reviewed === "approved" ? (
        <Notice tone="success" className="mt-8">
          {t("admin.noticeStudioApproved")}
        </Notice>
      ) : null}
      {reviewed === "rejected" ? (
        <Notice tone="warning" className="mt-8">
          {t("admin.noticeApplicationRejected")}
        </Notice>
      ) : null}

      <form
        action="/admin/vendors"
        className="mt-8 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto] md:items-end"
      >
        <label className="grid gap-2 text-sm">
          {t("admin.vendorsSearchLabel")}
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.applicationStatusLabel")}
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">{t("admin.allStatuses")}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {t(statusLabelKeys[value])}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          {t("common.filter")}
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        {t("admin.vendorsCount", { count: formatNumber(total) })}
      </p>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Store className="size-5" aria-hidden="true" />}
          title={t("admin.vendorsEmptyTitle")}
          description={t("admin.vendorsEmptyBody")}
          className="mt-8"
        />
      ) : (
        <div className="mt-8 space-y-5">
          {pendingCount === 0 ? (
            <p className="text-xs text-muted-foreground">{t("admin.noApplicationsWaiting")}</p>
          ) : null}

          <ul className="space-y-5">
            {applications.map((application) => (
              <li key={application.id}>
                <article className="rounded-xl border border-border bg-surface p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h2 className="font-display text-2xl font-medium tracking-[-0.02em]">
                          {application.name}
                        </h2>
                        <VendorStatusBadge status={application.status} />
                      </div>
                      <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                        /{application.slug}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("admin.appliedOn", { date: formatDate(application.createdAt) })}
                    </p>
                  </div>

                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="inline text-muted-foreground">{t("admin.ownerLabel")} </dt>
                      <dd className="inline font-medium">{application.owner.name}</dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">{t("auth.email")} </dt>
                      <dd className="inline font-medium break-all">{application.owner.email}</dd>
                    </div>
                  </dl>

                  <p className="mt-4 max-w-3xl text-sm leading-6 whitespace-pre-line">
                    {application.description || t("admin.noDescription")}
                  </p>

                  {application.status === "PENDING" ? (
                    <VendorReviewActions vendorId={application.id} />
                  ) : (
                    <div className="mt-5 border-t border-border pt-4 text-sm">
                      <p className="text-muted-foreground">
                        {application.reviewedAt
                          ? t("admin.reviewedOn", { date: formatDate(application.reviewedAt) })
                          : t("admin.reviewed")}
                      </p>
                      {application.reviewNote ? (
                        <p className="mt-2 max-w-3xl leading-6">
                          <span className="text-muted-foreground">{t("admin.noteLabel")} </span>
                          {application.reviewNote}
                        </p>
                      ) : null}
                      {application.appealedAt && application.appealReason ? (
                        <section className="mt-4 rounded-lg bg-surface-muted p-4">
                          <p className="eyebrow text-muted-foreground">
                            {t("admin.applicantAppeal")}
                          </p>
                          <p className="mt-2 leading-6 whitespace-pre-line">
                            {application.appealReason}
                          </p>
                          {application.appealReviewedAt ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                              {t("admin.appealReviewedOn", {
                                date: formatDate(application.appealReviewedAt),
                              })}
                              {application.appealReviewNote
                                ? ` · ${application.appealReviewNote}`
                                : ""}
                            </p>
                          ) : (
                            <VendorAppealReviewActions vendorId={application.id} />
                          )}
                        </section>
                      ) : null}
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ul>
        </div>
      )}
      <PagedNav
        pathname="/admin/vendors"
        params={{ status, q: search }}
        page={currentPage}
        pageCount={pageCount(total)}
        label={t("common.pagination")}
      />
    </PageShell>
  );
}

function AdminSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={loadingLabel}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 space-y-5">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </PageShell>
  );
}

export const instant = false;
