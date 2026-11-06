import { ArrowRight, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { Reveal } from "@/components/motion/reveal";
import { PageShell } from "@/components/storefront/page-shell";
import type { CategorySummary } from "@/features/catalog/types";

export interface HomeHeroProps {
  stats: {
    products: number;
    vendors: number;
    categories: number;
  };
  popularCategories: Pick<CategorySummary, "name" | "slug">[];
}

export function HomeHero({ stats, popularCategories }: HomeHeroProps) {
  return (
    <section aria-labelledby="home-hero-heading" className="hero-wash relative overflow-hidden">
      <PageShell className="grid gap-9 py-9 sm:py-12 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-center lg:gap-x-12 lg:py-14">
        <Reveal className="max-w-[34rem] min-w-0">
          <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-2 text-muted-foreground">
            <span aria-hidden="true" className="h-px w-[18px] bg-accent" />
            Marketplace · {stats.products} objects · {stats.vendors} studios
          </p>

          <h1
            id="home-hero-heading"
            className="mt-4 font-display text-[clamp(2.25rem,9vw,3.625rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance"
          >
            Independent sellers.{" "}
            <em className="relative inline-block not-italic">
              One marketplace.
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-0.5 h-1 rounded-full bg-accent/85"
              />
            </em>
          </h1>

          <p className="mt-4 max-w-[44ch] text-[0.9375rem] leading-[1.65] text-muted-foreground">
            Shop home, fashion, beauty and more from independent studios and verified sellers — with
            the maker, materials and origin visible on every listing.
          </p>

          {popularCategories.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[0.6875rem] text-muted-foreground">
              <span className="font-medium text-foreground">Popular</span>
              {popularCategories.map((category, index) => (
                <span key={category.slug} className="inline-flex items-center gap-2.5">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="rounded-sm transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
                  >
                    {category.name}
                  </Link>
                  {index < popularCategories.length - 1 ? (
                    <span aria-hidden="true" className="size-[3px] rounded-full bg-border" />
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-border pt-4">
            {[
              { label: "Objects", value: stats.products },
              { label: "Studios", value: stats.vendors },
              { label: "Departments", value: stats.categories },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-lg leading-[1.1] font-semibold tracking-[-0.03em]">
                  {value}
                  <span
                    aria-hidden="true"
                    className="mt-0.5 block font-mono text-[0.6875rem] font-normal tracking-[0.12em] text-muted-foreground uppercase"
                  >
                    {label}
                  </span>
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={0.06} className="min-w-0">
          <div className="relative aspect-[4/4.3] overflow-hidden rounded-[18px] border border-border bg-surface-muted shadow-[0_28px_70px_rgba(16,26,58,0.18)] sm:aspect-[4/5]">
            <Image
              src="/images/hero/seller-studio.jpg"
              alt="A seller working on a laptop at a sunlit desk, with a SupplyHub seller dashboard open"
              fill
              priority
              sizes="(min-width: 1024px) 46vw, 100vw"
              className="object-cover object-[center_55%]"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[rgba(6,10,24,0.32)]"
            />

            <span className="absolute top-3.5 right-3.5 z-10 inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/90 px-2.5 py-1.5 text-[0.6875rem] font-medium text-sage shadow-sm backdrop-blur">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Verified sellers
            </span>

            <div className="absolute inset-x-4 bottom-4 z-10 flex items-end justify-between gap-3.5 rounded-xl border border-border/60 bg-surface/95 px-3.5 py-3 shadow-[0_14px_30px_rgba(4,8,20,0.18)] backdrop-blur">
              <div className="min-w-0">
                <p className="eyebrow text-muted-foreground">Seller studio</p>
                <strong className="mt-1 block text-[0.8125rem] font-medium tracking-[-0.01em]">
                  Your storefront, on SupplyHub
                </strong>
              </div>
              <Link
                href="/vendor/apply"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-[0.6875rem] font-medium text-accent transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface focus-visible:outline-none"
              >
                Open a studio
                <ArrowRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Reveal>
      </PageShell>
    </section>
  );
}
