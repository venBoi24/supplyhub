import type { Metadata } from "next";
import { connection } from "next/server";
import { ArrowRight, FileText, Heart, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CategoryTile } from "@/components/storefront/category-tile";
import { FilterChip } from "@/components/storefront/filter-chip";
import { HomeHero } from "@/components/storefront/home-hero";
import { PageShell } from "@/components/storefront/page-shell";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { HomePageSkeleton } from "@/components/storefront/skeletons";

import {
  NEW_ARRIVAL_PERIODS,
  newArrivalsSince,
  parseNewArrivalPeriod,
  type NewArrivalPeriod,
} from "@/features/catalog/new-arrivals";
import {
  getCatalogStats,
  listCategorySummaries,
  listProducts,
  listVendorSummaries,
} from "@/features/catalog/queries";
import { getServerI18n } from "@/i18n/server";

export const metadata: Metadata = {
  title: { absolute: "SupplyHub — independent sellers, one marketplace" },
  description:
    "Shop home, fashion, beauty and more from independent studios and verified sellers — with the maker, materials and origin visible on every listing.",
  alternates: { canonical: "/" },
};

const trustItems = [
  { icon: Truck, key: "home.trustDelivery" },
  { icon: ShieldCheck, key: "home.trustCheckout" },
  { icon: Heart, key: "home.trustMakers" },
  { icon: Store, key: "home.trustDirect" },
] as const;

const benefits = [
  {
    icon: ShieldCheck,
    titleKey: "home.benefitProvenance",
    copyKey: "home.benefitProvenanceBody",
  },
  {
    icon: FileText,
    titleKey: "home.benefitDetail",
    copyKey: "home.benefitDetailBody",
  },
  {
    icon: Truck,
    titleKey: "home.benefitDelivery",
    copyKey: "home.benefitDeliveryBody",
  },
] as const;

const periodLabelKey: Record<NewArrivalPeriod, string> = {
  day: "home.newToday",
  week: "home.newThisWeek",
  month: "home.newThisMonth",
};

export default function StorefrontHomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeContent({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  // New arrivals are time-relative, so compute the window at request time. Without
  // this dynamic access, `new Date()` inside newArrivalsSince would run during the
  // static prerender and Next.js blocks it as an unstable value.
  await connection();
  const params = await searchParams;
  const period = parseNewArrivalPeriod(params.new);
  const [{ t }, stats, categories, vendors, featuredProducts, newArrivals] = await Promise.all([
    getServerI18n(),
    getCatalogStats(),
    listCategorySummaries(),
    listVendorSummaries(),
    listProducts({ sort: "featured", limit: 8 }),
    listProducts({ sort: "newest", limit: 8, publishedAfter: newArrivalsSince(period) }),
  ]);

  const featureVendor = vendors[0];
  const featureImage = featureVendor
    ? (await listProducts({ vendor: featureVendor.slug, limit: 1 }))[0]
    : undefined;
  const featureStory =
    featureVendor?.story.trim() ||
    (featureVendor
      ? t("home.spotlightFallback", {
          studio: featureVendor.name,
          count: featureVendor.productCount,
          objects: featureVendor.productCount === 1 ? t("nav.object") : t("nav.objects"),
        })
      : "");

  const preferredCategorySlugs = ["home-living", "clothing-fashion", "jewelry-accessories"];
  const preferredCategories = preferredCategorySlugs.flatMap((slug) => {
    const category = categories.find((item) => item.slug === slug);
    return category ? [{ name: category.name, slug: category.slug }] : [];
  });
  const popularCategories =
    preferredCategories.length > 0
      ? preferredCategories
      : categories.slice(0, 3).map(({ name, slug }) => ({ name, slug }));

  return (
    <>
      <HomeHero stats={stats} popularCategories={popularCategories} t={t} />

      <div className="border-b border-border bg-surface">
        <PageShell>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 sm:grid-cols-4">
            {trustItems.map(({ icon: Icon, key }) => (
              <li key={key} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="size-4 shrink-0 text-sage" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </PageShell>
      </div>

      <section
        id="new-arrivals"
        aria-labelledby="new-arrivals-heading"
        className="scroll-mt-20 border-b border-border bg-surface py-12 sm:py-16"
      >
        <PageShell>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="eyebrow text-muted-foreground">{t("home.freshFromStudios")}</p>
              <h2
                id="new-arrivals-heading"
                className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
              >
                {t("home.newArrivals")}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {t("home.newArrivalsDescription")}
              </p>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/products?sort=newest">
                {t("common.viewAllObjects")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div
            className="mt-6 flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t("home.newArrivalsPeriod")}
          >
            {NEW_ARRIVAL_PERIODS.map((value) => (
              <FilterChip
                key={value}
                href={`/?new=${value}#new-arrivals`}
                active={period === value}
              >
                {t(periodLabelKey[value])}
              </FilterChip>
            ))}
          </div>

          <div className="mt-8">
            {newArrivals.length > 0 ? (
              <ProductGrid products={newArrivals} priorityCount={4} />
            ) : (
              <EmptyState
                icon={<Sparkles className="size-5" aria-hidden="true" />}
                title={t("home.newArrivalsEmpty")}
                description={t("home.newArrivalsEmptyBody")}
              >
                <Button asChild>
                  <Link href="/products?sort=newest">{t("common.browseAllObjects")}</Link>
                </Button>
              </EmptyState>
            )}
          </div>
        </PageShell>
      </section>

      <section
        id="departments"
        aria-labelledby="departments-heading"
        className="scroll-mt-20 border-b border-border bg-surface"
      >
        <PageShell className="py-10 sm:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">{t("home.shopByDepartment")}</p>
              <h2
                id="departments-heading"
                className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
              >
                {t("home.browseCategories")}
              </h2>
            </div>
            <Button asChild variant="link" size="sm">
              <Link href="/products">
                {t("products.title")}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((category, index) => (
              <CategoryTile key={category.slug} category={category} priority={index < 4} />
            ))}
          </div>
        </PageShell>
      </section>

      <section className="border-b border-border bg-surface py-12 sm:py-16">
        <PageShell>
          <SectionHeading
            eyebrow={t("home.discoverProducts")}
            title={t("home.featured")}
            description={t("home.featuredDescription")}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/products">{t("common.viewAllObjects")}</Link>
              </Button>
            }
          />
          <div className="mt-8">
            <ProductGrid products={featuredProducts} priorityCount={4} />
          </div>
        </PageShell>
      </section>

      {featureVendor ? (
        <section className="border-b border-border bg-sand-soft/50 py-12 sm:py-16">
          <PageShell>
            <div className="grid overflow-hidden rounded-2xl border border-border bg-sand-soft lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative min-h-[18rem] bg-sand">
                {featureImage ? (
                  <Image
                    src={featureImage.image.src}
                    alt={featureImage.image.alt}
                    fill
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center">
                    <span className="font-display text-5xl font-semibold tracking-[-0.04em] text-sand-ink/60">
                      {featureVendor.monogram}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col justify-center p-7 sm:p-10">
                <p className="eyebrow text-sage">{t("home.studioSpotlight")}</p>
                <h2 className="mt-3 font-display text-3xl leading-[1.05] font-semibold tracking-[-0.035em] text-balance">
                  {featureVendor.name}
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-sand-ink/85 sm:text-base">
                  {featureStory}
                </p>

                <div className="mt-7 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-md border border-sand-ink/15 bg-sand font-display text-sm font-semibold text-sand-ink">
                    {featureVendor.monogram}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{featureVendor.name}</p>
                    <p className="mt-0.5 text-xs text-sand-ink/70">
                      {featureVendor.location || t("common.independentStudio")} ·{" "}
                      {featureVendor.productCount}{" "}
                      {featureVendor.productCount === 1 ? t("nav.object") : t("nav.objects")}
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <Button asChild variant="secondary" className="bg-surface">
                    <Link href={`/vendors/${featureVendor.slug}`}>
                      {t("home.visitTheStudio")}
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </PageShell>
        </section>
      ) : null}

      <section className="bg-surface py-12 sm:py-16">
        <PageShell>
          <div className="grid gap-8 sm:grid-cols-3">
            {benefits.map(({ icon: Icon, titleKey, copyKey }, index) => (
              <div key={titleKey}>
                <span
                  className={
                    index === 0
                      ? "grid size-9 place-items-center rounded-md bg-sage-soft text-sage"
                      : index === 1
                        ? "grid size-9 place-items-center rounded-md bg-accent-soft text-accent"
                        : "grid size-9 place-items-center rounded-md bg-sky text-sky-ink"
                  }
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.02em]">
                  {t(titleKey)}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  {t(copyKey)}
                </p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </>
  );
}
