import type { Metadata } from "next";
import { ArrowRight, FileText, Heart, ShieldCheck, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { CategoryTile } from "@/components/storefront/category-tile";
import { HeroSlider } from "@/components/storefront/hero-slider";
import { PageShell } from "@/components/storefront/page-shell";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { HomePageSkeleton } from "@/components/storefront/skeletons";

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

const trustItems = [
  { icon: Truck, label: "Delivery priced by distance" },
  { icon: ShieldCheck, label: "Secure checkout" },
  { icon: Heart, label: "Named makers" },
  { icon: Store, label: "Studio-direct orders" },
] as const;

const benefits = [
  {
    icon: ShieldCheck,
    title: "Maker provenance",
    copy: "Every listing carries the studio, location, and maker behind the object.",
  },
  {
    icon: FileText,
    title: "Clear product detail",
    copy: "Materials, dimensions and care notes stay visible, not buried.",
  },
  {
    icon: Truck,
    title: "Delivery that fits",
    copy: "Pickup or distance-based delivery, shown clearly before checkout.",
  },
] as const;

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

  const featureVendor = vendors[0];
  const featureImage = featureVendor
    ? (await listProducts({ vendor: featureVendor.slug, limit: 1 }))[0]
    : undefined;
  const featureStory =
    featureVendor?.story.trim() ||
    (featureVendor
      ? `${featureVendor.name} is an approved studio with ${featureVendor.productCount} ${
          featureVendor.productCount === 1 ? "object" : "objects"
        } in the current catalog.`
      : "");

  return (
    <>
      <section className="relative overflow-hidden bg-primary text-primary-foreground">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,rgba(249,115,22,0.2),transparent_38%),radial-gradient(circle_at_90%_64%,rgba(249,115,22,0.1),transparent_30%)]"
        />
        <PageShell className="relative grid gap-10 py-10 sm:py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-12 lg:py-16">
          <Reveal className="max-w-xl">
            <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-primary-foreground/70">
              <span aria-hidden="true" className="h-px w-6 bg-accent" />
              Marketplace · {stats.products} objects · {stats.vendors} studios
            </p>
            <h1 className="mt-5 font-display text-[clamp(2.6rem,5.2vw,4rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
              Objects with a maker&rsquo;s name on them.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-primary-foreground/70 sm:text-lg">
              Ceramics, leather and cloth from independent workshops — with the maker, materials and
              origin visible on every listing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="px-6">
                <Link href="/products">
                  Shop all objects
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="border-white/30 bg-transparent px-6 text-primary-foreground hover:border-white/60 hover:bg-white/10 hover:text-white"
              >
                <Link href="/vendors">Meet the studios</Link>
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.06}>
            <HeroSlider />
          </Reveal>
        </PageShell>
      </section>

      <div className="border-b border-border bg-surface">
        <PageShell>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3 py-4 sm:grid-cols-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                <Icon className="size-4 shrink-0 text-sage" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </PageShell>
      </div>

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

      <section className="border-b border-border bg-surface py-12 sm:py-16">
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
                <p className="eyebrow text-sage">Studio spotlight</p>
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
                      {featureVendor.location || "Independent studio"} ·{" "}
                      {featureVendor.productCount}{" "}
                      {featureVendor.productCount === 1 ? "object" : "objects"}
                    </p>
                  </div>
                </div>

                <div className="mt-7">
                  <Button asChild variant="secondary" className="bg-surface">
                    <Link href={`/vendors/${featureVendor.slug}`}>
                      Visit the studio
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
            {benefits.map(({ icon: Icon, title, copy }, index) => (
              <div key={title}>
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
                  {title}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{copy}</p>
              </div>
            ))}
          </div>
        </PageShell>
      </section>
    </>
  );
}
