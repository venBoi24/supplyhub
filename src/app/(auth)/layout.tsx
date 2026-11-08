import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { BottomNav } from "@/components/storefront/bottom-nav";
import { BottomNavSkeleton } from "@/components/storefront/skeletons";
import { SkipLink } from "@/components/storefront/skip-link";
import { Wordmark } from "@/components/storefront/wordmark";
import { listVendorSummaries } from "@/features/catalog/queries";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <div className="grid min-h-dvh lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative hidden overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgb(255_255_255/0.08),transparent_38%),radial-gradient(circle_at_82%_88%,rgb(161_74_43/0.28),transparent_45%)]"
          />

          <Link
            href="/"
            className="relative inline-flex w-fit rounded-sm focus-visible:ring-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-4 focus-visible:ring-offset-primary focus-visible:outline-none"
          >
            <Wordmark />
          </Link>

          <div className="relative max-w-md">
            <p className="eyebrow text-primary-foreground/60">The SupplyHub registry</p>
            <p className="mt-5 font-display text-4xl leading-[1.02] font-medium tracking-[-0.04em] text-balance">
              Every object arrives with the name of the person who made it.
            </p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-primary-foreground/70">
              One account keeps your orders, saved studios, and vendor workspace together. No
              marketplace noise, just the record of what you bought and who made it.
            </p>
          </div>

          <div className="relative space-y-3">
            <p className="eyebrow text-primary-foreground/50">On the registry</p>
            <Suspense fallback={<div className="h-[6.5rem]" aria-hidden="true" />}>
              <RegistryVendors />
            </Suspense>
          </div>
        </aside>

        <div className="bottom-nav-clearance flex min-h-dvh flex-col">
          <header className="flex items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link
              href="/"
              className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background focus-visible:outline-none lg:hidden"
            >
              <Wordmark />
            </Link>
            <span className="hidden lg:block" aria-hidden="true" />
            <Link
              href="/"
              className="rounded-sm text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
            >
              Back to shop
            </Link>
          </header>

          <main id="main" className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-md">{children}</div>
          </main>

          <footer className="px-5 pb-8 text-center text-xs text-muted-foreground sm:px-8">
            Sessions expire after seven days. SupplyHub never stores card details.
          </footer>

          <Suspense fallback={<BottomNavSkeleton />}>
            <BottomNav />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function RegistryVendors() {
  const vendors = (await listVendorSummaries()).slice(0, 3);

  return (
    <ul className="grid gap-2.5">
      {vendors.map((vendor) => (
        <li
          key={vendor.slug}
          className="flex items-baseline justify-between gap-4 border-t border-primary-foreground/15 pt-2.5 font-mono text-[0.625rem] tracking-[0.13em] uppercase"
        >
          <span>{vendor.name}</span>
          <span className="truncate text-primary-foreground/60">{vendor.location}</span>
        </li>
      ))}
    </ul>
  );
}
