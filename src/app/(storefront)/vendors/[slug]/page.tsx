import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Pagination } from "@/components/storefront/pagination";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { CatalogPageSkeleton } from "@/components/storefront/skeletons";
import { SortLinks } from "@/components/storefront/sort-links";
import { StudioCompactCard } from "@/components/storefront/studio-card";
import { getVendorBySlug, listProductPage, listVendorSummaries } from "@/features/catalog/queries";
import { parseCatalogQuery } from "@/features/catalog/search-params";
import type { VendorSummary } from "@/features/catalog/types";

export async function generateMetadata({
  params,
}: PageProps<"/vendors/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    return { title: "Studio not found" };
  }

  return {
    title: vendor.name,
    description: `${vendor.name} is an independent ${vendor.discipline.toLowerCase()} studio in ${vendor.location}. ${vendor.story}`,
    alternates: { canonical: `/vendors/${vendor.slug}` },
  };
}

export default async function VendorPage({ params, searchParams }: PageProps<"/vendors/[slug]">) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) {
    notFound();
  }

  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <VendorContent vendor={vendor} searchParams={searchParams} />
    </Suspense>
  );
}

async function VendorContent({
  vendor,
  searchParams,
}: {
  vendor: VendorSummary;
  searchParams: PageProps<"/vendors/[slug]">["searchParams"];
}) {
  const rawQuery = await searchParams;
  const query = parseCatalogQuery(rawQuery);
  const [results, mosaicResults, allStudios] = await Promise.all([
    listProductPage({ vendor: vendor.slug, sort: query.sort, page: query.page }),
    listProductPage({ vendor: vendor.slug, sort: "featured", limit: 2 }),
    listVendorSummaries(),
  ]);
  const mosaic = mosaicResults.items;
  const otherStudios = allStudios.filter((item) => item.slug !== vendor.slug);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/vendors"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          Studios
        </Link>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        <span aria-current="page" className="text-foreground">
          {vendor.name}
        </span>
      </nav>

      <div className="mt-8 grid gap-10 border-b border-border pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16">
        <div className="max-w-xl">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid size-14 place-items-center rounded-[5px] border border-clay/30 bg-paper font-display text-xl font-semibold text-clay"
            >
              {vendor.monogram}
            </span>
            <p className="eyebrow text-muted-foreground">
              {vendor.discipline} · {vendor.location}
            </p>
          </div>
          <h1 className="mt-6 font-display text-4xl leading-none font-medium tracking-[-0.04em] sm:text-5xl">
            {vendor.name}
          </h1>
          <p className="mt-5 text-base leading-7 text-muted-foreground">{vendor.story}</p>
          <p className="mt-6 font-mono text-[0.6875rem] tracking-[0.14em] text-muted-foreground uppercase">
            Independent studio · {vendor.productCount}{" "}
            {vendor.productCount === 1 ? "object" : "objects"} in this edit
          </p>
        </div>

        {mosaic.length > 0 ? (
          <div className="grid grid-cols-2 items-start gap-3 sm:gap-4">
            {mosaic.map((product, index) => (
              <div
                key={product.slug}
                className={
                  index === 1
                    ? "mt-10 overflow-hidden rounded-lg border border-border"
                    : "overflow-hidden rounded-lg border border-border"
                }
              >
                <Image
                  src={product.image.src}
                  alt=""
                  width={product.image.width}
                  height={product.image.height}
                  sizes="(min-width: 1024px) 22vw, 45vw"
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-xs text-muted-foreground">
          {results.total} {results.total === 1 ? "object" : "objects"} from {vendor.name}
        </p>
        <SortLinks pathname={`/vendors/${vendor.slug}`} query={{ ...query, page: 1 }} />
      </div>

      <div className="pb-4">
        <ProductGrid products={results.items} priorityCount={3} />
        <Pagination
          pathname={`/vendors/${vendor.slug}`}
          query={query}
          page={results.page}
          pageCount={results.pageCount}
        />
      </div>

      {otherStudios.length > 0 ? (
        <section className="mt-16 border-t border-border pt-10 sm:mt-20">
          <SectionHeading
            eyebrow="More studios"
            title="Keep meeting makers."
            description="Each studio in the preview has its own discipline, location, and way of working."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {otherStudios.map((studio) => (
              <StudioCompactCard key={studio.slug} vendor={studio} />
            ))}
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
