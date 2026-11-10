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
import { VerifiedStudioBadge } from "@/components/storefront/verified-studio-badge";
import { getVendorBySlug, listProductPage, listVendorSummaries } from "@/features/catalog/queries";
import { parseCatalogQuery } from "@/features/catalog/search-params";
import type { VendorSummary } from "@/features/catalog/types";
import { StudioChatButton } from "@/features/experience/widgets/studio-chat-button";
import { getServerI18n } from "@/i18n/server";

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
  const [{ t }, results, mosaicResults, allStudios] = await Promise.all([
    getServerI18n(),
    listProductPage({ vendor: vendor.slug, sort: query.sort, page: query.page }),
    listProductPage({ vendor: vendor.slug, sort: "featured", limit: 2 }),
    listVendorSummaries(),
  ]);
  const mosaic = mosaicResults.items;
  const otherStudios = allStudios.filter((item) => item.slug !== vendor.slug);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <nav
        aria-label={t("common.breadcrumb")}
        className="flex flex-wrap items-center gap-2 text-xs"
      >
        <Link
          href="/vendors"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {t("vendor.studiosTitle")}
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
            {t("common.independentStudio")} ·{" "}
            {t("vendor.objectsInEdit", { count: vendor.productCount })}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <VerifiedStudioBadge />
            <StudioChatButton vendorSlug={vendor.slug} vendorName={vendor.name} />
          </div>
          <ul className="mt-5 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            <li className="rounded-lg border border-border bg-surface px-3 py-2">
              <span className="block font-semibold text-foreground">{t("vendor.approved")}</span>
              {t("vendor.marketplaceVerifiedStudio")}
            </li>
            <li className="rounded-lg border border-border bg-surface px-3 py-2">
              <span className="block font-semibold text-foreground">{vendor.productCount}</span>
              {vendor.productCount === 1 ? t("vendor.liveListingOne") : t("vendor.liveListings")}
            </li>
            <li className="rounded-lg border border-border bg-surface px-3 py-2">
              <span className="block font-semibold text-foreground">{t("vendor.protected")}</span>
              {t("vendor.escrowEvery")}
            </li>
          </ul>
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
                  className="media-square w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <section className="mt-8 rounded-xl border border-border bg-surface p-4 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow text-muted-foreground">{t("vendor.studioLocation")}</p>
            <h2 className="mt-2 font-display text-xl font-medium">{vendor.location}</h2>
            {vendor.contactPhone ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t("vendor.contactStudio")}{" "}
                <a
                  href={`tel:${vendor.contactPhone}`}
                  className="font-medium text-accent underline underline-offset-4"
                >
                  {vendor.contactPhone}
                </a>
              </p>
            ) : null}
          </div>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendor.location)}`}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent underline underline-offset-4"
          >
            {t("vendor.openMaps")}
          </a>
        </div>
        <iframe
          title={t("vendor.mapsTitle", { location: vendor.location })}
          src={`https://maps.google.com/maps?q=${encodeURIComponent(
            typeof vendor.latitude === "number" && typeof vendor.longitude === "number"
              ? `${vendor.latitude},${vendor.longitude}`
              : vendor.location,
          )}&output=embed`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="mt-4 h-64 w-full rounded-lg border border-border"
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <p className="text-xs text-muted-foreground">
          {t("vendor.objectsFromStudio", {
            count: results.total,
            objects: results.total === 1 ? t("nav.object") : t("nav.objects"),
            studio: vendor.name,
          })}
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
            eyebrow={t("vendor.moreStudios")}
            title={t("vendor.keepMeeting")}
            description={t("vendor.moreStudiosDescription")}
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
