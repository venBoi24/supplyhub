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
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import { listVendorApplications } from "@/features/vendors/queries";
import type { VendorStatus } from "@/generated/prisma/enums";
import { parseEnumParam, parseSearchTerm, searchParamValue } from "@/features/admin/filters";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { formatDate } from "@/lib/utils/format-date";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Vendor applications",
  description: "Review studio applications for SupplyHub.",
  robots: { index: false, follow: false },
};

const statuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const satisfies readonly VendorStatus[];

export default function AdminVendorsPage({ searchParams }: PageProps<"/admin/vendors">) {
  return (
    <Suspense fallback={<AdminSkeleton />}>
      <AdminVendorsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminVendorsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/vendors">["searchParams"];
}) {
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
          <p className="eyebrow text-muted-foreground">Administration</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Vendor applications.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Review studio applications and open workspaces. Approving an application grants the
            owner the vendor role; every decision is recorded in the audit log.
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Signed in as {admin.name}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4 lg:gap-x-10">
          <div>
            <dt className="eyebrow text-muted-foreground">Pending</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.PENDING}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Approved</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.APPROVED}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Rejected</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.REJECTED}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Suspended</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.SUSPENDED}</dd>
          </div>
        </dl>
      </div>

      {reviewed === "approved" ? (
        <Notice tone="success" className="mt-8">
          Studio approved. The owner now has the vendor role and an open workspace.
        </Notice>
      ) : null}
      {reviewed === "rejected" ? (
        <Notice tone="warning" className="mt-8">
          Application rejected. The owner can see your note in their studio workspace.
        </Notice>
      ) : null}

      <form
        action="/admin/vendors"
        className="mt-8 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end"
      >
        <label className="grid gap-2 text-sm">
          Studio, owner, or email
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          Application status
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" size="sm">
          Filter
        </Button>
      </form>
      <p className="mt-4 text-xs text-muted-foreground">
        {total.toLocaleString()} matching studios. Status totals above include all applications.
      </p>

      {applications.length === 0 ? (
        <EmptyState
          icon={<Store className="size-5" aria-hidden="true" />}
          title="No studio applications yet."
          description="When a customer applies for a vendor workspace, the application appears here for review."
          className="mt-8"
        />
      ) : (
        <div className="mt-8 space-y-5">
          {pendingCount === 0 ? (
            <p className="text-xs text-muted-foreground">No applications are waiting for review.</p>
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
                      Applied {formatDate(application.createdAt)}
                    </p>
                  </div>

                  <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-t border-border pt-4 text-sm">
                    <div>
                      <dt className="inline text-muted-foreground">Owner </dt>
                      <dd className="inline font-medium">{application.owner.name}</dd>
                    </div>
                    <div>
                      <dt className="inline text-muted-foreground">Email </dt>
                      <dd className="inline font-medium break-all">{application.owner.email}</dd>
                    </div>
                  </dl>

                  <p className="mt-4 max-w-3xl text-sm leading-6 whitespace-pre-line">
                    {application.description || "No description provided."}
                  </p>

                  {application.status === "PENDING" ? (
                    <VendorReviewActions vendorId={application.id} />
                  ) : (
                    <div className="mt-5 border-t border-border pt-4 text-sm">
                      <p className="text-muted-foreground">
                        {application.reviewedAt
                          ? `Reviewed ${formatDate(application.reviewedAt)}`
                          : "Reviewed"}
                      </p>
                      {application.reviewNote ? (
                        <p className="mt-2 max-w-3xl leading-6">
                          <span className="text-muted-foreground">Note: </span>
                          {application.reviewNote}
                        </p>
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
      />
    </PageShell>
  );
}

function AdminSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading vendor applications">
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
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
