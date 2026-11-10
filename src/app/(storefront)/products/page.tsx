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
import { getServerI18n } from "@/i18n/server";

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
  const [{ t }, categories, vendors] = await Promise.all([
    getServerI18n(),
    listCategorySummaries(),
    listVendorSummaries(),
  ]);
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
          <p className="eyebrow text-muted-foreground">{t("products.eyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {t("products.title")}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("products.catalogIntro", { count: vendors.length })}
          </p>
        </div>
        <div className="w-full lg:max-w-sm">
          <SearchForm defaultValue={query.q ?? ""} inputId="products-catalog-search" />
        </div>
      </div>

      <div className="border-b border-border py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow mr-1 text-muted-foreground">{t("products.department")}</span>
          <FilterChip href={clearFiltersHref} active={!activeCategory && !activeVendor && !query.q}>
            {t("common.all")}
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
          <span className="eyebrow mr-1 text-muted-foreground">{t("products.studio")}</span>
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
          {query.q
            ? t(results.total === 1 ? "search.matching" : "search.matchingPlural", {
                count: results.total,
                query: query.q,
              })
            : t("products.objectCount", {
                count: results.total,
                objects: results.total === 1 ? t("nav.object") : t("nav.objects"),
              })}
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
          title={t("products.noResults")}
          description={t("products.noResultsBody")}
          className="mb-4"
        >
          <Button asChild>
            <Link href="/products">{t("products.clearFilters")}</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">{t("search.searchTheCatalog")}</Link>
          </Button>
        </EmptyState>
      )}
    </PageShell>
  );
}
