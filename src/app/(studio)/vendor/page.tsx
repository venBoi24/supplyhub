import type { Metadata } from "next";
import { AlertCircle, BadgeCheck, Package, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderStatusPill } from "@/components/vendor/order-status-pill";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { StudioSetupPanel } from "@/components/vendor/studio-setup-panel";
import { VendorAppealForm } from "@/components/vendors/vendor-appeal-form";
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
import { getStudioProductStats, listVendorProducts } from "@/features/catalog/vendor-queries";
import { listVendorOrders } from "@/features/checkout/vendor-operations";
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
  const appealRequested = searchParamValue(params.appeal) === "1";

  if (vendor.status !== "APPROVED") {
    return (
      <>
        <StudioPageHead
          title={
            vendor.status === "PENDING"
              ? "Application under review"
              : vendor.status === "REJECTED"
                ? "Application not approved"
                : "Studio suspended"
          }
          description="Your studio application and its review status are shown here. Selling tools open after approval."
          action={<VendorStatusBadge status={vendor.status} className="rounded-full" />}
        />

        {submitted ? (
          <Notice tone="success" className="mb-4">
            Application submitted. A SupplyHub administrator will review it before your workspace
            opens.
          </Notice>
        ) : null}

        {appealRequested && vendor.status === "REJECTED" ? (
          <Notice tone="info" className="mb-4">
            Your studio application was rejected. Review the decision and submit your appeal below.
          </Notice>
        ) : null}

        {vendor.status === "PENDING" ? (
          <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              Your application is under review.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              An administrator reviews every studio before it can list objects. Nothing else is
              needed from you right now.
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

        {vendor.status === "REJECTED" ? (
          <section
            id="appeal"
            className="scroll-mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <Notice tone="danger">This studio application was not approved.</Notice>
            <h2 className="mt-6 font-display text-xl font-medium tracking-[-0.02em]">
              What happens next
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Applications cannot be resubmitted from this preview. Contact the SupplyHub team if
              you believe the decision was made in error.
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
            {vendor.appealedAt ? (
              <div className="mt-6 border-t border-border pt-6">
                <p className="eyebrow text-muted-foreground">Appeal submitted</p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-line">{vendor.appealReason}</p>
                {vendor.appealReviewedAt ? (
                  <p className="mt-3 text-sm leading-6" role="status">
                    {vendor.appealReviewNote ||
                      "Your appeal was reviewed and the rejection stands."}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground" role="status">
                    Your appeal is awaiting review.
                  </p>
                )}
              </div>
            ) : (
              <VendorAppealForm />
            )}
          </section>
        ) : null}

        {vendor.status === "SUSPENDED" ? (
          <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <Notice tone="danger">This studio workspace is suspended.</Notice>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              Listing, order, and account tools are unavailable while the studio is suspended.
              Contact the SupplyHub team for details.
            </p>
          </section>
        ) : null}

        <p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">
          Email settings and account details live on your{" "}
          <Link
            href="/account"
            className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            account page
          </Link>
          .
        </p>
      </>
    );
  }

  const [products, stats, orders] = await Promise.all([
    listVendorProducts(vendor.id),
    getStudioProductStats(vendor.id),
    listVendorOrders(vendor.id),
  ]);
  const recentOrders = orders.slice(0, 4);
  const departmentCount = new Set(products.map((product) => product.categoryName)).size;
  const profileReady =
    Boolean((vendor.story ?? vendor.description) && vendor.departments.length) &&
    vendor.latitude !== null &&
    vendor.longitude !== null;

  return (
    <>
      <StudioPageHead
        title="Overview"
        description="What needs your attention in the studio today."
        action={
          <Badge
            tone="neutral"
            className="rounded-full border-0 bg-sky font-sans text-[0.6563rem] font-medium tracking-normal text-sky-ink normal-case"
          >
            Last updated just now
          </Badge>
        }
      />

      <StudioSetupPanel
        hasProfile={Boolean((vendor.story ?? vendor.description) && vendor.departments.length)}
        hasLocation={vendor.latitude !== null && vendor.longitude !== null}
        objectCount={stats.total}
        submittedCount={stats.published + stats.pendingReview}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StudioKpi
          label="Total objects"
          value={stats.total}
          note={
            departmentCount > 0
              ? `Across ${departmentCount} ${departmentCount === 1 ? "department" : "departments"}`
              : "No departments yet"
          }
        />
        <StudioKpi label="Published" value={stats.published} note="Visible in the catalog" />
        <StudioKpi
          label="Pending review"
          value={stats.pendingReview}
          note="Waiting on an administrator"
        />
        <StudioKpi label="Low stock" value={stats.lowStock} note="Published items at 4 or fewer" />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[1.5fr_1fr]">
        <section
          aria-labelledby="recent-orders-heading"
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <h2 id="recent-orders-heading" className="text-[0.8125rem] font-semibold">
              Recent orders
            </h2>
            <Link
              href="/vendor/orders"
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              View all
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              No orders yet. Paid orders containing your objects will appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-surface-muted/60">
                    <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                      Order
                    </th>
                    <th className="hidden px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase sm:table-cell">
                      Buyer
                    </th>
                    <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                      Total
                    </th>
                    <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                        {order.order.orderNumber}
                      </td>
                      <td className="hidden px-4 py-2.5 text-xs sm:table-cell">
                        {order.order.recipientName}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                        {formatMoney(decimalToCents(order.subtotal), order.currency)}
                      </td>
                      <td className="px-4 py-2.5">
                        <OrderStatusPill status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-3">
          <section
            aria-labelledby="attention-heading"
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3.5">
              <h2 id="attention-heading" className="text-[0.8125rem] font-semibold">
                Needs attention
              </h2>
            </div>
            <ul className="px-4 py-1">
              {stats.pendingReview > 0 ? (
                <AttentionRow
                  icon={AlertCircle}
                  tone="bg-warning/10 text-warning"
                  title={`${stats.pendingReview} ${
                    stats.pendingReview === 1 ? "object" : "objects"
                  } pending review`}
                  copy="Wait for approval before editing."
                />
              ) : (
                <AttentionRow
                  icon={BadgeCheck}
                  tone="bg-sage-soft text-sage"
                  title="No objects awaiting review"
                  copy="Everything in the catalog is reviewed."
                />
              )}

              {stats.lowStock > 0 ? (
                <AttentionRow
                  icon={Package}
                  tone="bg-accent-soft text-accent"
                  title={`${stats.lowStock} published ${
                    stats.lowStock === 1 ? "object is" : "objects are"
                  } low on stock`}
                  copy="Adjust inventory before the next order."
                />
              ) : (
                <AttentionRow
                  icon={BadgeCheck}
                  tone="bg-sage-soft text-sage"
                  title="Stock levels look healthy"
                  copy="No published object is at 4 or fewer."
                />
              )}

              {profileReady ? (
                <AttentionRow
                  icon={ShieldCheck}
                  tone="bg-sage-soft text-sage"
                  title="Studio profile is complete"
                  copy="Location and departments are set."
                />
              ) : (
                <AttentionRow
                  icon={AlertCircle}
                  tone="bg-warning/10 text-warning"
                  title="Finish your studio profile"
                  copy="Add your story, departments and pickup location."
                  href="/vendor/profile"
                />
              )}
            </ul>
          </section>

          <section
            aria-labelledby="top-objects-heading"
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <h2 id="top-objects-heading" className="text-[0.8125rem] font-semibold">
                Top objects
              </h2>
              <Link
                href="/vendor/products"
                className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                Manage
              </Link>
            </div>

            {products.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                No objects yet.{" "}
                <Link
                  href="/vendor/products/new"
                  className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  Add your first object
                </Link>
                .
              </p>
            ) : (
              <ul className="px-4 py-1">
                {products.slice(0, 3).map((product) => (
                  <li key={product.id} className="border-b border-border last:border-b-0">
                    <Link
                      href={`/vendor/products/${product.id}`}
                      className="flex items-center gap-3 py-2.5 transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
                    >
                      <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-sand-soft">
                        {product.image ? (
                          <Image
                            src={product.image.src}
                            alt={product.image.alt}
                            fill
                            sizes="36px"
                            className="object-cover"
                          />
                        ) : (
                          <Package className="size-4 text-sand-ink/60" aria-hidden="true" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium">{product.name}</span>
                        <span className="mt-0.5 block text-[0.6563rem] text-muted-foreground">
                          {formatMoney(product.priceCents, product.currency)} · {product.stock} in
                          stock
                        </span>
                      </span>
                      <ProductStatusBadge status={product.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <p className="mt-6 border-t border-border pt-5 text-xs text-muted-foreground">
        Email settings and account details live on your{" "}
        <Link
          href="/account"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          account page
        </Link>
        .
      </p>
    </>
  );
}

function StudioKpi({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="font-mono text-[0.625rem] font-medium tracking-[0.08em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-2 font-display text-[1.75rem] leading-none font-semibold tracking-[-0.03em]">
        {value}
      </p>
      <p className="mt-1.5 text-[0.6875rem] leading-4 text-muted-foreground">{note}</p>
    </div>
  );
}

function AttentionRow({
  icon: Icon,
  tone,
  title,
  copy,
  href,
}: {
  icon: typeof AlertCircle;
  tone: string;
  title: string;
  copy: string;
  href?: string;
}) {
  const body = (
    <>
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tone}`}>
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-xs font-medium">{title}</span>
        <span className="mt-0.5 block text-[0.6875rem] leading-4 text-muted-foreground">
          {copy}
        </span>
      </span>
    </>
  );

  return (
    <li className="border-b border-border py-2.5 last:border-b-0">
      {href ? (
        <Link
          href={href}
          className="flex items-start gap-2.5 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-start gap-2.5">{body}</div>
      )}
    </li>
  );
}

function VendorSkeleton() {
  return (
    <div role="status" aria-label="Loading the studio workspace">
      <div className="mb-5">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-3.5 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="mt-3 h-72 w-full rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
