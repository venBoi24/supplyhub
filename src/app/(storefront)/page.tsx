import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, BadgeCheck, Compass, Ruler } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { MakerLabel } from "@/components/storefront/maker-label";
import { PageShell } from "@/components/storefront/page-shell";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { HomePageSkeleton } from "@/components/storefront/skeletons";
import { StudioCompactCard, StudioFeatureCard } from "@/components/storefront/studio-card";
import { HERO_IMAGE } from "@/features/catalog/constants";
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

const principles = [
  {
    icon: BadgeCheck,
    title: "Studios, not sellers",
    copy: "Each maker is listed with a location, a discipline, and a short studio story.",
  },
  {
    icon: Compass,
    title: "Provenance by default",
    copy: "The maker's name travels with every listing, from the product card to the detail page.",
  },
  {
    icon: Ruler,
    title: "Material detail",
    copy: "Materials, dimensions, and care notes sit beside the piece — not buried in a modal.",
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
  const [stats, categories, vendors, newest] = await Promise.all([
    getCatalogStats(),
    listCategorySummaries(),
    listVendorSummaries(),
    listProducts({ sort: "newest", limit: 6 }),
  ]);
  const heroVendor = vendors.find((vendor) => vendor.slug === "atelier-nord");
  const featureVendor = vendors[0];
  const featureImage = featureVendor
    ? (await listProducts({ vendor: featureVendor.slug, limit: 1 }))[0]
    : undefined;

  return (
    <>
      <section className="hero-wash border-b border-border">
        <PageShell className="grid gap-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pt-20 lg:pb-20">
          <div className="max-w-xl">
            <Reveal>
              <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
                <span aria-hidden="true" className="h-px w-8 bg-clay" />
                Independent studios · {stats.products} objects · {stats.vendors} makers
              </p>
              <h1 className="mt-6 font-display text-[clamp(2.9rem,6.7vw,5.35rem)] leading-[0.93] font-medium tracking-[-0.045em] text-balance">
                Objects with a{" "}
                <span className="relative inline-block whitespace-nowrap">
                  maker&apos;s name
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 200 8"
                    preserveAspectRatio="none"
                    className="absolute -bottom-1 left-0 h-2 w-full text-accent"
                  >
                    <path
                      d="M2 5.5C40 2 120 1.5 198 4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                on them.
              </h1>
              <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                A small, considered catalog of ceramics, leather, and cloth. Every piece is listed
                by the studio that made it — not an anonymous warehouse.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg">
                  <Link href="/products">
                    Browse the catalog
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/vendors">
                    Meet the studios
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.08}>
            <div className="relative overflow-hidden rounded-xl border border-border bg-surface-muted">
              <Image
                src={HERO_IMAGE.src}
                alt={HERO_IMAGE.alt}
                width={HERO_IMAGE.width}
                height={HERO_IMAGE.height}
                priority
                sizes="(min-width: 1024px) 46vw, 100vw"
                className="aspect-[4/5] w-full object-cover"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 ring-1 ring-black/5 ring-inset"
              />
              {heroVendor ? (
                <div className="pointer-events-none absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <MakerLabel vendor={heroVendor} variant="tag" tilt />
                </div>
              ) : null}
            </div>
            <div className="mt-3 flex items-start justify-between gap-6">
              <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                Still life from three studios: stoneware, vegetable-tanned leather, and stonewashed
                linen.
              </p>
              <p className="eyebrow shrink-0 text-muted-foreground">Demo photography</p>
            </div>
          </Reveal>
        </PageShell>
      </section>

      <section aria-labelledby="departments-heading" className="border-b border-border">
        <PageShell className="py-12 sm:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted-foreground">Departments</p>
              <h2
                id="departments-heading"
                className="mt-2 font-display text-2xl font-medium tracking-[-0.03em] sm:text-3xl"
              >
                Browse by department
              </h2>
            </div>
            <Button asChild variant="link" size="sm">
              <Link href="/products">
                All objects
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            {categories.map((category) => (
              <Link
                key={category.slug}
                href={`/categories/${category.slug}`}
                className="group bg-surface p-6 transition-colors duration-300 hover:bg-surface-muted/70 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset sm:p-7"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="eyebrow text-muted-foreground">
                    {category.productCount} pieces
                  </span>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-10 font-display text-2xl font-medium tracking-[-0.03em] transition-colors group-hover:text-accent">
                  {category.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{category.headline}</p>
              </Link>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-14 sm:py-20">
        <PageShell>
          <SectionHeading
            eyebrow="From the studios"
            title="Recently added"
            description="Current objects from the preview catalog. Each listing names its studio, materials, and dimensions, so you know what you are looking at before you click."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/products">View all objects</Link>
              </Button>
            }
          />
          <div className="mt-8">
            <ProductGrid products={newest} />
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border py-14 sm:py-20">
        <PageShell>
          <SectionHeading
            eyebrow="The studios"
            title="A short list, on purpose."
            description="A few independent workshops, each with a point of view and a named maker behind the work. Start with a studio and follow the objects."
            action={
              <Button asChild variant="link" size="sm">
                <Link href="/vendors">
                  Meet all studios
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </Button>
            }
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_1fr]">
            {featureVendor && featureImage ? (
              <StudioFeatureCard
                vendor={featureVendor}
                image={featureImage}
                className="min-h-[27rem] lg:min-h-full"
              />
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
              {vendors.slice(1).map((vendor) => (
                <StudioCompactCard key={vendor.slug} vendor={vendor} />
              ))}
            </div>
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border py-12 sm:py-14">
        <PageShell>
          <div className="grid gap-8 sm:grid-cols-3">
            {principles.map(({ icon: Icon, title, copy }) => (
              <div key={title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-md border border-border bg-surface text-accent">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-display text-lg font-medium tracking-[-0.02em]">{title}</h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="border-t border-border bg-surface-muted/50">
        <PageShell className="flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
          <div>
            <p className="eyebrow text-muted-foreground">The full catalog</p>
            <p className="mt-2 max-w-xl font-display text-2xl font-medium tracking-[-0.03em] text-balance sm:text-3xl">
              Small on purpose. Everything here has a maker behind it.
            </p>
          </div>
          <Button asChild size="lg">
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
