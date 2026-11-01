import type { Metadata } from "next";
import { ArrowUpRight, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { parseCatalogQuery } from "@/features/catalog/search-params";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the SupplyHub preview catalog by object, material, studio, or city.",
  alternates: { canonical: "/search" },
};

const suggestedSearches = ["stoneware", "indigo", "linen", "leather", "Portland"] as const;

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <SearchContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchContent({
  searchParams,
}: {
  searchParams: PageProps<"/search">["searchParams"];
}) {
  const params = await searchParams;
  const query = parseCatalogQuery(params);
  const [categories, vendors] = await Promise.all([listCategorySummaries(), listVendorSummaries()]);
  const results = query.q
    ? await listProductPage({ query: query.q, sort: query.sort, page: query.page })
    : null;

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Search</p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[0.98] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          {query.q ? `Results for “${query.q}”` : "Search the catalog"}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Find an object by name, material, studio, or city. The catalog is small enough to browse
          from start to finish, too.
        </p>
        <SearchForm
          defaultValue={query.q ?? ""}
          inputId="search-page-input"
          className="mt-6 max-w-xl"
        />
      </div>

      {!query.q ? (
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
          <section aria-labelledby="search-departments">
            <h2
              id="search-departments"
              className="font-display text-2xl font-medium tracking-[-0.03em]"
            >
              Start with a department
            </h2>
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="group flex items-start justify-between gap-4 py-4 transition-colors hover:text-accent"
                  >
                    <span>
                      <span className="font-display text-lg font-medium tracking-[-0.02em]">
                        {category.name}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        {category.headline} · {category.productCount} pieces
                      </span>
                    </span>
                    <ArrowUpRight
                      className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <aside className="space-y-8">
            <section aria-labelledby="search-suggestions">
              <h2 id="search-suggestions" className="eyebrow text-muted-foreground">
                Try a search
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestedSearches.map((term) => (
                  <Link
                    key={term}
                    href={`/search?q=${encodeURIComponent(term)}`}
                    className="rounded-full border border-border bg-surface px-3 py-1.5 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase transition-colors hover:border-border-strong hover:text-foreground"
                  >
                    {term}
                  </Link>
                ))}
              </div>
            </section>

            <section aria-labelledby="search-studios">
              <h2 id="search-studios" className="eyebrow text-muted-foreground">
                Or meet the studios
              </h2>
              <ul className="mt-3 space-y-2">
                {vendors.map((vendor) => (
                  <li key={vendor.slug}>
                    <Link
                      href={`/vendors/${vendor.slug}`}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {vendor.name} · {vendor.location}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      ) : results && results.items.length > 0 ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-xs text-muted-foreground">
              {results.total} {results.total === 1 ? "object" : "objects"} matching “{query.q}”
            </p>
            <SortLinks pathname="/search" query={{ ...query, page: 1 }} />
          </div>
          <ProductGrid products={results.items} priorityCount={3} />
          <Pagination
            pathname="/search"
            query={query}
            page={results.page}
            pageCount={results.pageCount}
          />
        </>
      ) : (
        <EmptyState
          icon={<SearchX className="size-5" aria-hidden="true" />}
          title="No objects match that search."
          description="Try a broader term, search by material or studio, or clear the search to browse the full catalog."
          className="mt-8"
        >
          <Button asChild>
            <Link href="/products">Browse all objects</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/search">Clear search</Link>
          </Button>
        </EmptyState>
      )}

      <div className="mt-12 flex items-center gap-3 border-t border-border pt-6 text-xs text-muted-foreground">
        <Search className="size-4" aria-hidden="true" />
        <p>Searches cover object names, materials, descriptions, studios, and locations.</p>
      </div>
    </PageShell>
  );
}
