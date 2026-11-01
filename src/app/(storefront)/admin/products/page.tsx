import type { Metadata } from "next";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { ProductControls } from "@/components/admin/product-controls";
import { PageShell } from "@/components/storefront/page-shell";
import { PagedNav } from "@/components/ui/paged-nav";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { getAdminProductCounts, listAdminProducts } from "@/features/catalog/admin-queries";
import { formatMoney } from "@/features/catalog/money";
import type { ProductStatus } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/utils/format-date";
import { pageCount, parsePage } from "@/lib/utils/pagination";
import { paginationHref, parseSearchTerm } from "@/features/admin/filters";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Catalog moderation",
  description: "Review, publish, and feature objects submitted by studios.",
  robots: { index: false, follow: false },
};

const statuses: Array<{ value: ProductStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "In review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Drafts" },
  { value: "REJECTED", label: "Returned" },
  { value: "ARCHIVED", label: "Archived" },
];

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): ProductStatus | undefined {
  return statuses.some((entry) => entry.value === value) ? (value as ProductStatus) : undefined;
}

export default function AdminProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<AdminProductsSkeleton />}>
      <AdminProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminProductsContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/products">["searchParams"];
}) {
  const [admin, query] = await Promise.all([requireAdmin(), searchParams]);
  const status = parseStatus(searchParamValue(query.status));
  const search = parseSearchTerm(query.q);
  const page = parsePage(searchParamValue(query.page));
  const [productResult, counts] = await Promise.all([
    listAdminProducts({ status, search, page }),
    getAdminProductCounts(),
  ]);
  const { products, total, page: currentPage } = productResult;
  const reviewed = searchParamValue(query.reviewed);
  const featuredUpdated = searchParamValue(query.featured) === "1";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Administration</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Catalog moderation.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Publish objects submitted by studios, return them with a note, or curate what appears in
            the featured edit. Every decision is recorded in the audit log.
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Signed in as {admin.name}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-x-8 gap-y-3 text-sm sm:grid-cols-5">
          <div>
            <dt className="eyebrow text-muted-foreground">Review</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.PENDING_REVIEW}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Published</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.PUBLISHED}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Drafts</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.DRAFT}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Returned</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.REJECTED}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted-foreground">Archived</dt>
            <dd className="mt-1 font-display text-2xl font-medium">{counts.ARCHIVED}</dd>
          </div>
        </dl>
      </div>

      {reviewed === "published" ? (
        <Notice tone="success" className="mt-8">
          Object published. It is visible on the storefront now.
        </Notice>
      ) : null}
      {reviewed === "rejected" ? (
        <Notice tone="warning" className="mt-8">
          Object returned to the studio with your note.
        </Notice>
      ) : null}
      {featuredUpdated ? (
        <Notice tone="success" className="mt-8">
          Featured selection updated.
        </Notice>
      ) : null}

      <nav aria-label="Filter by status" className="mt-8 flex flex-wrap items-center gap-2">
        <FilterLink
          href={paginationHref("/admin/products", { q: search }, 1)}
          active={status === undefined}
          label="All"
          count={
            counts.PENDING_REVIEW +
            counts.PUBLISHED +
            counts.DRAFT +
            counts.REJECTED +
            counts.ARCHIVED
          }
        />
        {statuses.map((entry) => (
          <FilterLink
            key={entry.value}
            href={paginationHref("/admin/products", { status: entry.value, q: search }, 1)}
            active={status === entry.value}
            label={entry.label}
            count={counts[entry.value]}
          />
        ))}
      </nav>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <form action="/admin/products" className="flex flex-wrap items-end gap-3">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="grid gap-2 text-sm">
            Product, SKU, studio, or department
            <Input name="q" defaultValue={search} maxLength={80} />
          </label>
          <Button type="submit" size="sm">
            Search
          </Button>
        </form>
        <Button asChild variant="secondary" size="sm">
          <Link
            href={`/api/admin/products/export?${new URLSearchParams({ ...(status ? { status } : {}), ...(search ? { q: search } : {}) }).toString()}`}
          >
            Export catalog
          </Link>
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {total.toLocaleString()} matching products.
      </p>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" aria-hidden="true" />}
          title="Nothing in this view."
          description="Objects appear here when studios create drafts or submit them for review."
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
                    width={88}
                    height={110}
                    className="h-28 w-[4.5rem] shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
                        {product.name}
                      </h2>
                      <ProductStatusBadge status={product.status} />
                      {product.featured ? (
                        <span className="font-mono text-[0.625rem] tracking-[0.14em] text-clay uppercase">
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                      {product.sku} · {product.categoryName} ·{" "}
                      <Link
                        href={`/vendors/${product.vendorSlug}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {product.vendorName}
                      </Link>
                    </p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                      {product.reviewNote ? (
                        <>
                          <span className="font-medium text-foreground">Last note: </span>
                          {product.reviewNote}
                        </>
                      ) : (
                        `${formatMoney(product.priceCents, product.currency)} · ${product.stock} ${
                          product.stock === 1 ? "unit" : "units"
                        } on hand`
                      )}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Updated {formatDate(product.updatedAt)}
                    </p>
                  </div>
                  {product.status === "PUBLISHED" ? (
                    <Link
                      href={`/products/${product.slug}`}
                      className="text-sm font-medium text-accent underline-offset-4 hover:underline"
                    >
                      View public page
                    </Link>
                  ) : null}
                </div>

                <ProductControls
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
        pathname="/admin/products"
        params={{ status, q: search }}
        page={currentPage}
        pageCount={pageCount(total)}
      />
    </PageShell>
  );
}

function FilterLink({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-md border border-border-strong bg-surface-muted px-3 py-1.5 text-sm font-medium text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          : "inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      }
    >
      {label}
      <span className="font-mono text-[0.625rem] tracking-[0.1em]">{count}</span>
    </Link>
  );
}

function AdminProductsSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading catalog moderation">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-96 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="mt-8 h-10 w-full max-w-2xl" />
        <div className="mt-8 space-y-4">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
