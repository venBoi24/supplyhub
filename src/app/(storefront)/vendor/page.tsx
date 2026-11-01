import type { Metadata } from "next";
import { ArrowUpRight, Package, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioNav } from "@/components/vendor/studio-nav";
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import { formatMoney } from "@/features/catalog/money";
import { getStudioProductStats, listVendorProducts } from "@/features/catalog/vendor-queries";
import { getVendorForOwner } from "@/features/vendors/queries";
import { formatDate } from "@/lib/utils/format-date";
import { requireActor } from "@/server/auth/guards";
import { canApplyForVendor } from "@/server/auth/policies";

export const metadata: Metadata = {
  title: "Studio workspace",
  description: "Track your SupplyHub studio application and workspace status.",
  robots: { index: false, follow: false },
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function VendorWorkspacePage({ searchParams }: PageProps<"/vendor">) {
  return (
    <Suspense fallback={<VendorSkeleton />}>
      <VendorContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VendorContent({
  searchParams,
}: {
  searchParams: PageProps<"/vendor">["searchParams"];
}) {
  const actor = await requireActor("/vendor");
  const [params, vendor] = await Promise.all([searchParams, getVendorForOwner(actor.id)]);

  if (!vendor) {
    if (actor.role === "ADMIN") {
      redirect("/admin/vendors");
    }

    redirect(canApplyForVendor(actor) ? "/vendor/apply" : "/account?denied=vendor");
  }

  const submitted = searchParamValue(params.submitted) === "1";
  const sent = searchParamValue(params.sent) === "1";
  const archived = searchParamValue(params.archived) === "1";
  const deleted = searchParamValue(params.deleted) === "1";
  const dashboard =
    vendor.status === "APPROVED"
      ? await Promise.all([listVendorProducts(vendor.id), getStudioProductStats(vendor.id)])
      : null;
  const products = dashboard?.[0] ?? [];
  const stats = dashboard?.[1] ?? null;

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Studio workspace</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {vendor.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {vendor.status === "APPROVED"
              ? "Add objects, adjust stock, and submit drafts for review. Orders and payouts arrive in a later phase."
              : "Listings, orders, and payouts will run from here once the next phases land. For now this workspace tracks your studio application."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VendorStatusBadge status={vendor.status} />
          <Link
            href="/account"
            className="inline-flex items-center gap-1 rounded-sm text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            Account
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {vendor.status === "APPROVED" ? (
        <div className="mt-6">
          <StudioNav />
        </div>
      ) : null}

      {submitted && vendor.status !== "APPROVED" ? (
        <Notice tone="success" className="mt-8">
          Application submitted. A SupplyHub administrator will review it before your workspace
          opens.
        </Notice>
      ) : null}

      {vendor.status === "PENDING" ? (
        <section className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <h2 className="font-display text-2xl font-medium tracking-[-0.02em]">
            Your application is under review.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            An administrator reviews every studio before it can list objects. Nothing else is needed
            from you right now.
          </p>

          <dl className="mt-7 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-muted-foreground">Handle</dt>
              <dd className="mt-1.5 font-mono text-xs tracking-[0.08em]">/{vendor.slug}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Submitted</dt>
              <dd className="mt-1.5 font-medium">{formatDate(vendor.createdAt)}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Status</dt>
              <dd className="mt-1.5 font-medium">Waiting for review</dd>
            </div>
          </dl>

          {vendor.description ? (
            <div className="mt-6 border-t border-border pt-6">
              <p className="eyebrow text-muted-foreground">Your application</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 whitespace-pre-line">
                {vendor.description}
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {vendor.status === "APPROVED" && stats ? (
        <>
          {sent ? (
            <Notice tone="success" className="mt-8">
              Object submitted. An administrator will review it before it appears on the storefront.
            </Notice>
          ) : null}
          {archived ? (
            <Notice tone="warning" className="mt-8">
              Object archived. It is no longer visible on the storefront.
            </Notice>
          ) : null}
          {deleted ? (
            <Notice tone="success" className="mt-8">
              Draft deleted.
            </Notice>
          ) : null}

          <dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StudioStat label="Objects" value={stats.total} />
            <StudioStat label="Published" value={stats.published} />
            <StudioStat label="In review" value={stats.pendingReview} />
            <StudioStat label="Low stock" value={stats.lowStock} />
          </dl>

          <section aria-labelledby="studio-objects-heading" className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="eyebrow text-muted-foreground">Your catalog</p>
                <h2
                  id="studio-objects-heading"
                  className="mt-2 font-display text-2xl font-medium tracking-[-0.02em]"
                >
                  Studio objects
                </h2>
              </div>
              <Link
                href="/vendor/products/new"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                <Plus className="size-4" aria-hidden="true" />
                New object
              </Link>
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={<Package className="size-5" aria-hidden="true" />}
                title="No objects yet."
                description="Create a draft, describe the object, and add an image. You can submit it for review when it is ready."
                className="mt-6"
              >
                <Link
                  href="/vendor/products/new"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Create the first object
                </Link>
              </EmptyState>
            ) : (
              <ul className="mt-6 space-y-3">
                {products.map((product) => (
                  <li key={product.id}>
                    <Link
                      href={`/vendor/products/${product.id}`}
                      className="flex flex-wrap items-center gap-4 rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:flex-nowrap"
                    >
                      <Image
                        src={product.image?.src ?? "/images/demo/placeholder.jpg"}
                        alt={product.image?.alt ?? ""}
                        width={64}
                        height={80}
                        className="h-20 w-16 shrink-0 rounded-sm object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{product.name}</p>
                        <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                          {product.sku} · {product.categoryName}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                        <ProductStatusBadge status={product.status} />
                        <p className="text-sm text-muted-foreground">
                          {formatMoney(product.priceCents, product.currency)} · {product.stock}{" "}
                          {product.stock === 1 ? "unit" : "units"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <dl className="mt-10 grid gap-4 rounded-xl border border-border bg-surface p-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="eyebrow text-muted-foreground">Handle</dt>
              <dd className="mt-1.5 font-mono text-xs tracking-[0.08em]">/{vendor.slug}</dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Approved</dt>
              <dd className="mt-1.5 font-medium">
                {vendor.reviewedAt ? formatDate(vendor.reviewedAt) : formatDate(vendor.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="eyebrow text-muted-foreground">Access</dt>
              <dd className="mt-1.5 font-medium">Studio owner</dd>
            </div>
          </dl>
        </>
      ) : null}

      {vendor.status === "REJECTED" ? (
        <section className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <Notice tone="danger">This studio application was not approved.</Notice>
          <h2 className="mt-6 font-display text-2xl font-medium tracking-[-0.02em]">
            What happens next
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Applications cannot be resubmitted from this preview. Contact the SupplyHub team if you
            believe the decision was made in error.
          </p>
          <div className="mt-6 border-t border-border pt-6">
            <p className="eyebrow text-muted-foreground">Reviewer note</p>
            <p className="mt-2 max-w-2xl text-sm leading-6">
              {vendor.reviewNote || "No note was included with this decision."}
            </p>
            {vendor.reviewedAt ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Reviewed {formatDate(vendor.reviewedAt)}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {vendor.status === "SUSPENDED" ? (
        <section className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
          <Notice tone="danger">This studio workspace is suspended.</Notice>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            Listing, order, and account tools are unavailable while the studio is suspended. Contact
            the SupplyHub team for details.
          </p>
        </section>
      ) : null}

      <div className="mt-10 flex items-center gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>
          Email settings and account details live on your{" "}
          <Link
            href="/account"
            className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            account page
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}

function StudioStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <dt className="eyebrow text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-medium tracking-[-0.02em]">{value}</dd>
    </div>
  );
}

function VendorSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the studio workspace">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-12 w-64 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="mt-8 h-64 w-full rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
