import Link from "next/link";

import { DEMO_CATALOG_NOTICE } from "@/features/catalog/constants";
import { listCategorySummaries, listVendorSummaries } from "@/features/catalog/queries";

import { PageShell } from "./page-shell";
import { Wordmark } from "./wordmark";

const footerLinkClassName =
  "inline-flex w-fit text-sm text-primary-foreground/70 transition-colors hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-primary";

export async function SiteFooter() {
  const [categories, vendors] = await Promise.all([listCategorySummaries(), listVendorSummaries()]);

  return (
    <footer className="mt-20 hidden border-t border-border bg-primary text-primary-foreground md:block">
      <PageShell className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.8fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Wordmark />
            <p className="mt-5 text-sm leading-6 text-primary-foreground/70">
              A preview of a curated marketplace for independent studios. Every listing carries the
              name of the person or workshop that made it.
            </p>
            <p className="eyebrow mt-8 text-primary-foreground/60">Demo catalog</p>
            <p className="mt-2 text-xs leading-5 text-primary-foreground/55">
              {DEMO_CATALOG_NOTICE}
            </p>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">Shop</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/products" className={footerLinkClassName}>
                  All objects
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/categories/${category.slug}`} className={footerLinkClassName}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">Studios</h2>
            <ul className="mt-4 space-y-2.5">
              {vendors.map((vendor) => (
                <li key={vendor.slug}>
                  <Link href={`/vendors/${vendor.slug}`} className={footerLinkClassName}>
                    {vendor.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/vendors" className={footerLinkClassName}>
                  All studios
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="eyebrow text-primary-foreground/60">Browse</h2>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/search" className={footerLinkClassName}>
                  Search
                </Link>
              </li>
              <li>
                <Link href="/products?sort=newest" className={footerLinkClassName}>
                  Newest arrivals
                </Link>
              </li>
              <li>
                <Link href="/products?sort=price-asc" className={footerLinkClassName}>
                  Lowest price first
                </Link>
              </li>
              <li>
                <Link href="/delivery-live?persona=buyer" className={footerLinkClassName}>
                  Live delivery tracking
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 SupplyHub. An independent demo project.</p>
          <p className="font-mono tracking-[0.12em] uppercase">Next.js · Prisma · PostgreSQL</p>
        </div>
      </PageShell>
    </footer>
  );
}
