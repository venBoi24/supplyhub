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
import { getServerI18n } from "@/i18n/server";
import { requireActor } from "@/server/auth/guards";
import { canApplyForVendor } from "@/server/auth/policies";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.title"),
    description: t("studio.overviewDescription"),
    robots: { index: false, follow: false },
  };
}

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
  const { t, formatDate } = await getServerI18n();
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
              ? t("studio.applicationUnderReview")
              : vendor.status === "REJECTED"
                ? t("studio.applicationNotApproved")
                : t("studio.studioSuspended")
          }
          description={t("studio.applicationStatusDescription")}
          action={<VendorStatusBadge status={vendor.status} className="rounded-full" />}
        />

        {submitted ? (
          <Notice tone="success" className="mb-4">
            {t("studio.submittedNotice")}
          </Notice>
        ) : null}

        {appealRequested && vendor.status === "REJECTED" ? (
          <Notice tone="info" className="mb-4">
            {t("studio.appealNotice")}
          </Notice>
        ) : null}

        {vendor.status === "PENDING" ? (
          <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              {t("studio.underReviewTitle")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("studio.underReviewBody")}
            </p>

            <dl className="mt-7 grid gap-4 border-t border-border pt-6 text-sm sm:grid-cols-3">
              <div>
                <dt className="eyebrow text-muted-foreground">{t("studio.handle")}</dt>
                <dd className="mt-1.5 font-mono text-xs tracking-[0.08em]">/{vendor.slug}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("studio.submitted")}</dt>
                <dd className="mt-1.5 font-medium">{formatDate(vendor.createdAt)}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("common.status")}</dt>
                <dd className="mt-1.5 font-medium">{t("studio.waitingForReview")}</dd>
              </div>
            </dl>

            {vendor.description ? (
              <div className="mt-6 border-t border-border pt-6">
                <p className="eyebrow text-muted-foreground">{t("studio.yourApplication")}</p>
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
            <Notice tone="danger">{t("studio.notApprovedNotice")}</Notice>
            <h2 className="mt-6 font-display text-xl font-medium tracking-[-0.02em]">
              {t("studio.whatNext")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("studio.whatNextBody")}
            </p>
            <div className="mt-6 border-t border-border pt-6">
              <p className="eyebrow text-muted-foreground">{t("studio.reviewerNote")}</p>
              <p className="mt-2 max-w-2xl text-sm leading-6">
                {vendor.reviewNote || t("studio.noReviewNote")}
              </p>
              {vendor.reviewedAt ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t("studio.reviewedOn", { date: formatDate(vendor.reviewedAt) })}
                </p>
              ) : null}
            </div>
            {vendor.appealedAt ? (
              <div className="mt-6 border-t border-border pt-6">
                <p className="eyebrow text-muted-foreground">{t("studio.appealSubmitted")}</p>
                <p className="mt-2 text-sm leading-6 whitespace-pre-line">{vendor.appealReason}</p>
                {vendor.appealReviewedAt ? (
                  <p className="mt-3 text-sm leading-6" role="status">
                    {vendor.appealReviewNote || t("studio.appealRejectionStands")}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground" role="status">
                    {t("studio.appealAwaiting")}
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
            <Notice tone="danger">{t("studio.suspendedNotice")}</Notice>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
              {t("studio.suspendedBody")}
            </p>
          </section>
        ) : null}

        <p className="mt-8 border-t border-border pt-5 text-xs text-muted-foreground">
          {t("studio.accountSettingsBefore")}{" "}
          <Link
            href="/account"
            className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            {t("studio.accountPageLink")}
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
        title={t("studio.overview")}
        description={t("studio.overviewDescription")}
        action={
          <Badge
            tone="neutral"
            className="rounded-full border-0 bg-sky font-sans text-[0.6563rem] font-medium tracking-normal text-sky-ink normal-case"
          >
            {t("studio.lastUpdated")}
          </Badge>
        }
      />

      <StudioSetupPanel
        hasProfile={Boolean((vendor.story ?? vendor.description) && vendor.departments.length)}
        hasLocation={vendor.latitude !== null && vendor.longitude !== null}
        objectCount={stats.total}
        submittedCount={stats.total}
      />

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StudioKpi
          label={t("studio.totalObjects")}
          value={stats.total}
          note={
            departmentCount > 0
              ? t("studio.acrossDepartments", {
                  count: departmentCount,
                  departments:
                    departmentCount === 1 ? t("common.departmentOne") : t("common.departmentMany"),
                })
              : t("studio.noDepartments")
          }
        />
        <StudioKpi
          label={t("studio.published")}
          value={stats.published}
          note={t("studio.visibleInCatalog")}
        />
        <StudioKpi label={t("studio.drafts")} value={stats.drafts} note={t("studio.draftsNote")} />
        <StudioKpi
          label={t("common.lowStock")}
          value={stats.lowStock}
          note={t("studio.lowStockNote")}
        />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[1.5fr_1fr]">
        <section
          aria-labelledby="recent-orders-heading"
          className="overflow-hidden rounded-xl border border-border bg-surface"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <h2 id="recent-orders-heading" className="text-[0.8125rem] font-semibold">
              {t("studio.recentOrders")}
            </h2>
            <Link
              href="/vendor/orders"
              className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              {t("common.viewAll")}
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">
              {t("studio.noOrders")}
            </p>
          ) : (
            <>
              {/* Phones: stacked rows that wrap in place — no horizontal scrolling. */}
              <ul className="divide-y divide-border sm:hidden">
                {recentOrders.map((order) => (
                  <li key={order.id} className="px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <span className="min-w-0 font-mono text-xs break-all tabular-nums">
                        {order.order.orderNumber}
                      </span>
                      <OrderStatusPill status={order.status} />
                    </div>
                    <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
                      <span className="min-w-0 break-words text-muted-foreground">
                        {order.order.recipientName}
                      </span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {formatMoney(decimalToCents(order.subtotal), order.currency)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="scroll-x hidden sm:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-surface-muted/60">
                      <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        {t("studio.order")}
                      </th>
                      <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        {t("studio.buyer")}
                      </th>
                      <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        {t("common.total")}
                      </th>
                      <th className="px-4 py-2 font-mono text-[0.5625rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                        {t("common.status")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border last:border-b-0">
                        <td className="px-4 py-2.5 font-mono text-xs tabular-nums">
                          {order.order.orderNumber}
                        </td>
                        <td className="px-4 py-2.5 text-xs">{order.order.recipientName}</td>
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
            </>
          )}
        </section>

        <div className="space-y-3">
          <section
            aria-labelledby="attention-heading"
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="border-b border-border px-4 py-3.5">
              <h2 id="attention-heading" className="text-[0.8125rem] font-semibold">
                {t("studio.needsAttention")}
              </h2>
            </div>
            <ul className="px-4 py-1">
              {stats.drafts > 0 ? (
                <AttentionRow
                  icon={AlertCircle}
                  tone="bg-warning/10 text-warning"
                  title={t("studio.draftsPending", {
                    count: stats.drafts,
                    objects: stats.drafts === 1 ? t("nav.object") : t("nav.objects"),
                  })}
                  copy={t("studio.publishWhenReady")}
                  href="/vendor/products"
                />
              ) : (
                <AttentionRow
                  icon={BadgeCheck}
                  tone="bg-sage-soft text-sage"
                  title={t("studio.allObjectsLive")}
                  copy={t("studio.allObjectsLiveNote")}
                />
              )}

              {stats.lowStock > 0 ? (
                <AttentionRow
                  icon={Package}
                  tone="bg-accent-soft text-accent"
                  title={t("studio.lowStockCount", {
                    count: stats.lowStock,
                    objects: stats.lowStock === 1 ? t("nav.object") : t("nav.objects"),
                  })}
                  copy={t("studio.adjustInventory")}
                />
              ) : (
                <AttentionRow
                  icon={BadgeCheck}
                  tone="bg-sage-soft text-sage"
                  title={t("studio.stockHealthy")}
                  copy={t("studio.stockHealthyNote")}
                />
              )}

              {profileReady ? (
                <AttentionRow
                  icon={ShieldCheck}
                  tone="bg-sage-soft text-sage"
                  title={t("studio.profileComplete")}
                  copy={t("studio.profileCompleteNote")}
                />
              ) : (
                <AttentionRow
                  icon={AlertCircle}
                  tone="bg-warning/10 text-warning"
                  title={t("studio.finishProfile")}
                  copy={t("studio.finishProfileNote")}
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
                {t("studio.topObjects")}
              </h2>
              <Link
                href="/vendor/products"
                className="rounded-sm text-xs text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
              >
                {t("studio.manage")}
              </Link>
            </div>

            {products.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                {t("studio.noObjects")}{" "}
                <Link
                  href="/vendor/products/new"
                  className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                >
                  {t("studio.addFirstObject")}
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
                          {formatMoney(product.priceCents, product.currency)} ·{" "}
                          {t("studio.inStock", { count: product.stock })}
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
        {t("studio.accountSettingsBefore")}{" "}
        <Link
          href="/account"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("studio.accountPageLink")}
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

async function VendorSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingWorkspace")}>
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
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
