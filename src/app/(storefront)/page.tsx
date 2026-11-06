import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, Compass, PackageSearch, Store } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { CategoryTile } from "@/components/storefront/category-tile";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { MakerLabel } from "@/components/storefront/maker-label";
import { PageShell } from "@/components/storefront/page-shell";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { HomePageSkeleton } from "@/components/storefront/skeletons";
import { StudioCompactCard, StudioFeatureCard } from "@/components/storefront/studio-card";

import {
  getCatalogStats,
  listCategorySummaries,
  listProducts,
  listVendorSummaries,
} from "@/features/catalog/queries";

export const metadata: Metadata = {
  title: { absolute: "SupplyHub — objects with a maker's name on them" },
  description:
    "A curated marketplace preview for independent studios. Browse ceramics, leather goods, and textiles with provenance on every listing.",
  alternates: { canonical: "/" },
};

const benefits = [
  {
    icon: PackageSearch,
    title: "Discover by material",
    copy: "Filter by ceramic, leather, linen, and other materials used by each studio.",
  },
  {
    icon: BadgeCheck,
    title: "Maker provenance",
    copy: "Every listing carries the studio, location, and maker behind the object.",
  },
  {
    icon: Store,
    title: "Independent studios",
    copy: "Browse a small, curated set of workshops rather than an anonymous catalog.",
  },
  {
    icon: Compass,
    title: "Clear product detail",
    copy: "Materials, dimensions, care notes, and maker information stay visible.",
  },
];

export default function StorefrontHomePage() {
  return (
    <Suspense fallback={<HomePageSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const [stats, categories, vendors, featuredProducts] = await Promise.all([
    getCatalogStats(),
    listCategorySummaries(),
    listVendorSummaries(),
    listProducts({ sort: "featured", limit: 8 }),
  ]);

  const heroVendor = vendors.find((vendor) => vendor.slug === "atelier-nord");
  const featureVendor = vendors[0];
  const featureImage = featureVendor
    ? (await listProducts({ vendor: featureVendor.slug, limit: 1 }))[0]
    : undefined;

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,color-mix(in_oklab,var(--accent)_18%,transparent),transparent_34%),linear-gradient(180deg,var(--surface)_0%,var(--background)_100%)]"
        />
        <PageShell className="relative grid gap-8 py-8 sm:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-10 lg:py-14">
          <Reveal className="max-w-xl">
            <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
              <span aria-hidden="true" className="h-px w-10 bg-accent" />
              Marketplace · {stats.products} objects · {stats.vendors} studios
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.5rem,5.4vw,4.25rem)] leading-[0.96] font-semibold tracking-[-0.045em] text-balance">
              Shop objects made by independent studios.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Browse ceramics, leather, and cloth with the maker, materials, and origin visible on
              every listing.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="px-6">
                <Link href="/products">
                  Shop all objects
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="px-6">
                <Link href="#departments">
                  Browse categories
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-5">
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
                  {stats.products}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Objects</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
                  {stats.vendors}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Studios</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold tracking-[-0.03em]">
                  {stats.categories}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Departments</p>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <HeroSlider />
            {heroVendor ? (
              <div className="mt-4 flex items-center justify-between gap-3">
                <MakerLabel vendor={heroVendor} variant="tag" tilt />
                <p className="text-xs text-muted-foreground">
                  Demo photography from the preview catalog.
                </p>
              </div>
            ) : null}
          </Reveal>
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
              <p className="eyebrow text-muted-foreground">Shop by department</p>
              <h2
                id="departments-heading"
                className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl"
              >
                Browse categories
              </h2>
            </div>
            <Button asChild variant="link" size="sm">
              <Link href="/products">
                All objects
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

      <section className="py-12 sm:py-16">
        <PageShell>
          <SectionHeading
            eyebrow="Discover products"
            title="Featured objects"
            description="Real products from the catalog, with prices, availability, and maker information."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/products">View all objects</Link>
              </Button>
            }
          />
          <div className="mt-8">
            <ProductGrid products={featuredProducts} priorityCount={4} />
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border bg-surface-muted/40 py-12 sm:py-16">
        <PageShell>
          <SectionHeading
            eyebrow="Featured studios"
            title="Shop by maker"
            description="A small set of independent workshops, each with a named maker and a distinct point of view."
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/vendors">
                  Meet all studios
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
            {featureVendor && featureImage ? (
              <StudioFeatureCard
                vendor={featureVendor}
                image={featureImage}
                priority
                className="min-h-[24rem] lg:min-h-full"
              />
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {vendors.slice(1, 4).map((vendor) => (
                <StudioCompactCard key={vendor.slug} vendor={vendor} />
              ))}
            </div>
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border bg-surface py-10 sm:py-12">
        <PageShell>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="rounded-2xl border border-border bg-background p-5">
                <span className="grid size-10 place-items-center rounded-md bg-accent-soft text-accent">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <h2 className="mt-4 font-display text-lg font-semibold tracking-[-0.02em]">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border bg-primary text-primary-foreground">
        <PageShell className="flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center sm:py-12">
          <div className="max-w-2xl">
            <p className="eyebrow text-primary-foreground/60">The full catalog</p>
            <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.03em] text-balance sm:text-3xl">
              Browse every object with its maker, materials, and price.
            </p>
          </div>
          <Button asChild size="lg" variant="secondary" className="px-6">
            <Link href="/products">
              Browse all objects
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </PageShell>
      </section>
    </>
  );
}
