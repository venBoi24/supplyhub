import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChip } from "@/components/storefront/filter-chip";
import { PageShell } from "@/components/storefront/page-shell";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SearchForm } from "@/components/storefront/search-form";
import { CatalogPageSkeleton } from "@/components/storefront/skeletons";
import { SortLinks } from "@/components/storefront/sort-links";
import {
  listCategorySummaries,
  listProductPage,
  listVendorSummaries,
} from "@/features/catalog/queries";
import { catalogHref, parseCatalogQuery } from "@/features/catalog/search-params";
import { PRODUCTS_PER_PAGE } from "@/features/catalog/types";

export const metadata: Metadata = {
  title: "All objects",
  description:
    "Browse every object in the SupplyHub preview catalog: ceramics, leather goods, and textiles from independent studios.",
  alternates: { canonical: "/products" },
};

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: PageProps<"/products">["searchParams"];
}) {
  const params = await searchParams;
  const query = parseCatalogQuery(params);
  const [categories, vendors] = await Promise.all([listCategorySummaries(), listVendorSummaries()]);
  const activeCategory = query.category
    ? categories.find((item) => item.slug === query.category)
    : undefined;
  const activeVendor = query.vendor
    ? vendors.find((item) => item.slug === query.vendor)
    : undefined;
  const hasUnknownFilter =
    Boolean(query.category && !activeCategory) || Boolean(query.vendor && !activeVendor);

  const results = hasUnknownFilter
    ? { items: [], total: 0, page: 1, pageCount: 1, perPage: PRODUCTS_PER_PAGE }
    : await listProductPage({
        category: activeCategory?.slug,
        vendor: activeVendor?.slug,
        query: query.q,
        sort: query.sort,
        page: query.page,
      });

  const filterQuery = { ...query, page: 1 };
  const clearFiltersHref = catalogHref("/products", { sort: query.sort });

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">The catalog</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            All objects
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            A considered edit from {vendors.length} independent studios. Filter by department or
            studio, then follow the maker&apos;s name on each listing.
          </p>
        </div>
        <div className="w-full lg:max-w-sm">
          <SearchForm defaultValue={query.q ?? ""} inputId="products-catalog-search" />
        </div>
      </div>

      <div className="border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 text-muted-foreground">Department</span>
          <FilterChip href={clearFiltersHref} active={!activeCategory && !activeVendor && !query.q}>
            All
          </FilterChip>
          {categories.map((category) => (
            <FilterChip
              key={category.slug}
              href={catalogHref("/products", { ...filterQuery, category: category.slug })}
              active={activeCategory?.slug === category.slug}
            >
              {category.name}
            </FilterChip>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <span className="eyebrow mr-1 text-muted-foreground">Studio</span>
          {vendors.map((vendor) => (
            <FilterChip
              key={vendor.slug}
              href={catalogHref("/products", { ...filterQuery, vendor: vendor.slug })}
              active={activeVendor?.slug === vendor.slug}
            >
              {vendor.name}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-xs text-muted-foreground">
          {results.total} {results.total === 1 ? "object" : "objects"}
          {query.q ? ` matching “${query.q}”` : ""}
        </p>
        <SortLinks pathname="/products" query={filterQuery} />
      </div>

      {results.items.length > 0 ? (
        <div className="pb-4">
          <ProductGrid products={results.items} priorityCount={3} />
          <Pagination
            pathname="/products"
            query={query}
            page={results.page}
            pageCount={results.pageCount}
          />
        </div>
      ) : (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden="true" />}
          title="No objects match those filters."
          description="Try a different department or studio, clear the filters, or search the catalog for a material or maker."
          className="mb-4"
        >
          <Button asChild>
            <Link href="/products">Clear filters</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">Search the catalog</Link>
          </Button>
        </EmptyState>
      )}
    </PageShell>
  );
}
