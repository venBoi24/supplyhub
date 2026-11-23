import type { Metadata } from "next";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { AdminPostControls } from "@/components/admin/admin-post-controls";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import {
  getAdminProductCounts,
  listAdminCategories,
  listAdminProducts,
} from "@/features/catalog/admin-queries";
import { listVendorSummaries } from "@/features/catalog/queries";
import { formatMoney } from "@/features/catalog/money";
import type { ProductStatus } from "@/generated/prisma/enums";
import { parsePage, pageCount } from "@/lib/utils/pagination";
import { searchParamValue } from "@/features/admin/filters";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("admin.posts"),
    description: t("admin.productsIntro"),
    robots: { index: false, follow: false },
  };
}

const statuses = ["PENDING_REVIEW", "PUBLISHED", "DRAFT", "REJECTED", "ARCHIVED"] as const;

function parseStatus(value: string | undefined): ProductStatus | undefined {
  return statuses.includes(value as ProductStatus) ? (value as ProductStatus) : undefined;
}

export default async function AdminPostsPage({ searchParams }: PageProps<"/admin/posts">) {
  const { t } = await getServerI18n();
  return (
    <Suspense fallback={<AdminPostsSkeleton loadingLabel={t("common.loading")} />}>
      <AdminPostsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminPostsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/posts">["searchParams"];
}) {
  const { t, formatDate, formatNumber } = await getServerI18n();
  await requireAdmin();
  const query = await searchParams;
  const status = parseStatus(searchParamValue(query.status));
  const search = searchParamValue(query.q)?.trim() || undefined;
  const categorySlug = searchParamValue(query.category) || undefined;
  const vendorSlug = searchParamValue(query.vendor) || undefined;
  const dateFrom = searchParamValue(query.from) || undefined;
  const dateTo = searchParamValue(query.to) || undefined;
  const page = parsePage(searchParamValue(query.page));

  const [productResult, counts, categories, vendors] = await Promise.all([
    listAdminProducts({ status, search, categorySlug, vendorSlug, dateFrom, dateTo, page }),
    getAdminProductCounts(),
    listAdminCategories(),
    listVendorSummaries(),
  ]);
  const { products, total, page: currentPage } = productResult;
  const hidden = searchParamValue(query.hidden) === "1";
  const restored = searchParamValue(query.restored) === "1";
  const deleted = searchParamValue(query.deleted) === "1";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">{t("admin.nav")}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {t("admin.postManagement")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("admin.productsIntro")}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-5">
          {statuses.map((entry) => (
            <div key={entry}>
              <dt className="eyebrow text-muted-foreground">{entry}</dt>
              <dd className="mt-1 font-display text-2xl font-medium">{formatNumber(counts[entry])}</dd>
            </div>
          ))}
        </dl>
      </div>

      {hidden ? <Notice tone="success" className="mt-8">{t("admin.success.postHidden")}</Notice> : null}
      {restored ? <Notice tone="success" className="mt-8">{t("admin.success.postRestored")}</Notice> : null}
      {deleted ? <Notice tone="success" className="mt-8">{t("admin.success.postDeleted")}</Notice> : null}

      <form action="/admin/posts" className="mt-8 grid gap-3 rounded-xl border border-border bg-surface p-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-2 text-sm">
          {t("common.search")}
          <Input name="q" defaultValue={search} maxLength={80} />
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.filterByStatus")}
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">{t("common.all")}</option>
            {statuses.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.departments")}
          <Select name="category" defaultValue={categorySlug ?? ""}>
            <option value="">{t("common.all")}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.vendors")}
          <Select name="vendor" defaultValue={vendorSlug ?? ""}>
            <option value="">{t("common.all")}</option>
            {vendors.map((vendor) => (
              <option key={vendor.slug} value={vendor.slug}>
                {vendor.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.postPublishedOn")} from
          <Input name="from" type="date" defaultValue={dateFrom} />
        </label>
        <label className="grid gap-2 text-sm">
          {t("admin.postPublishedOn")} to
          <Input name="to" type="date" defaultValue={dateTo} />
        </label>
        <div className="flex items-end gap-3">
          <Button type="submit" size="sm">
            {t("common.filter")}
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/posts">{t("common.cancel")}</Link>
          </Button>
        </div>
      </form>

      <p className="mt-3 text-xs text-muted-foreground">
        {t("admin.productsCount", { count: formatNumber(total) })}
      </p>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" aria-hidden="true" />}
          title={t("admin.productsEmptyTitle")}
          description={t("admin.productsEmptyBody")}
          className="mt-8"
        />
      ) : (
        <ul className="mt-8 space-y-4">
          {products.map((product) => (
            <li key={product.id}>
              <article className="rounded-xl border border-border bg-surface p-5 sm:p-6">
                <div className="flex flex-wrap items-start gap-5">
                  <Image
                    src={product.images[0]?.src ?? "/images/demo/placeholder.jpg"}
                    alt={product.images[0]?.alt ?? ""}
                    width={96}
                    height={96}
                    className="size-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
                        {product.name}
                      </h2>
                      <ProductStatusBadge status={product.status} />
                      {product.featured ? (
                        <span className="font-mono text-[0.625rem] tracking-[0.14em] text-clay uppercase">
                          {t("common.featured")}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                      {product.sku} · {product.categoryName} ·{" "}
                      <Link href={`/vendors/${product.vendorSlug}`} className="underline-offset-4 hover:underline">
                        {product.vendorName}
                      </Link>
                    </p>
                    <p className="mt-3 text-sm text-muted-foreground">
                      {formatMoney(product.priceCents, product.currency)} · {formatNumber(product.stock)}{" "}
                      {product.stock === 1 ? t("common.unit") : t("common.units")}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t("admin.postPublishedOn")}: {product.publishedAt ? formatDate(product.publishedAt) : t("admin.notVerified")} ·{" "}
                      {t("admin.postUpdatedOn")}: {formatDate(product.updatedAt)}
                    </p>
                    {product.reviewNote ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t("admin.lastNote")} </span>
                        {product.reviewNote}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/admin/posts/${product.id}`}
                    className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                  >
                    {t("admin.postDetail")}
                  </Link>
                </div>

                <AdminPostControls
                  productId={product.id}
                  status={product.status}
                  featured={product.featured}
                />
              </article>
            </li>
          ))}
        </ul>
      )}

      <PagedNav
        pathname="/admin/posts"
        params={{ status, q: search, category: categorySlug, vendor: vendorSlug, from: dateFrom, to: dateTo }}
        page={currentPage}
        pageCount={pageCount(total)}
        label={t("common.pagination")}
      />
    </PageShell>
  );
}

function AdminPostsSkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={loadingLabel}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-96 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </PageShell>
  );
}

export const instant = false;