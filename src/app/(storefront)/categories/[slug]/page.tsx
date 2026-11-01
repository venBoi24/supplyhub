import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { FilterChip } from "@/components/storefront/filter-chip";
import { PageShell } from "@/components/storefront/page-shell";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { CatalogPageSkeleton } from "@/components/storefront/skeletons";
import { SortLinks } from "@/components/storefront/sort-links";
import {
  getCategoryBySlug,
  listCategorySummaries,
  listProductPage,
} from "@/features/catalog/queries";
import { parseCatalogQuery } from "@/features/catalog/search-params";
import type { CategorySummary } from "@/features/catalog/types";

export async function generateMetadata({
  params,
}: PageProps<"/categories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    return { title: "Department not found" };
  }

  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/categories/${category.slug}` },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CategoryContent category={category} searchParams={searchParams} />
    </Suspense>
  );
}

async function CategoryContent({
  category,
  searchParams,
}: {
  category: CategorySummary;
  searchParams: PageProps<"/categories/[slug]">["searchParams"];
}) {
  const rawQuery = await searchParams;
  const query = parseCatalogQuery(rawQuery);
  const [results, categories] = await Promise.all([
    listProductPage({ category: category.slug, sort: query.sort, page: query.page }),
    listCategorySummaries(),
  ]);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/products"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          All objects
        </Link>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        <span aria-current="page" className="text-foreground">
          {category.name}
        </span>
      </nav>

      <div className="mt-6 flex flex-col gap-8 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">
            Department · {category.productCount} {category.productCount === 1 ? "piece" : "pieces"}
          </p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {category.name}
          </h1>
          <p className="mt-3 font-display text-xl font-medium tracking-[-0.02em] text-muted-foreground">
            {category.headline}
          </p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {category.description}
          </p>
        </div>

        <nav aria-label="Departments" className="flex flex-wrap gap-2">
          <FilterChip href="/products" active={false}>
            All objects
          </FilterChip>
          {categories.map((item) => (
            <FilterChip
              key={item.slug}
              href={`/categories/${item.slug}`}
              active={item.slug === category.slug}
            >
              {item.name}
            </FilterChip>
          ))}
        </nav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-xs text-muted-foreground">
          {results.total} {results.total === 1 ? "object" : "objects"}
        </p>
        <SortLinks pathname={`/categories/${category.slug}`} query={{ ...query, page: 1 }} />
      </div>

      <div className="pb-4">
        <ProductGrid products={results.items} priorityCount={3} />
        <Pagination
          pathname={`/categories/${category.slug}`}
          query={query}
          page={results.page}
          pageCount={results.pageCount}
        />
      </div>
    </PageShell>
  );
}
