import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { SiteFooter } from "@/components/storefront/site-footer";
import { SiteHeader } from "@/components/storefront/site-header";
import { SiteFooterSkeleton, SiteHeaderSkeleton } from "@/components/storefront/skeletons";
import { SkipLink } from "@/components/storefront/skip-link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <>
      <SkipLink />
      <div className="flex min-h-dvh flex-col">
        <Suspense fallback={<SiteHeaderSkeleton />}>
          <SiteHeader />
        </Suspense>
        <main id="main" className="flex-1">
          <PageShell className="py-20 sm:py-28">
            <div className="max-w-xl border-t-2 border-clay pt-8">
              <p className="eyebrow text-muted-foreground">404 · Page not found</p>
              <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
                This page does not exist.
              </h1>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                The link may be outdated, or the page may have moved. Return to the storefront to
                keep browsing.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/products">Browse all objects</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/">Go to SupplyHub</Link>
                </Button>
              </div>
            </div>
          </PageShell>
        </main>
        <Suspense fallback={<SiteFooterSkeleton />}>
          <SiteFooter />
        </Suspense>
      </div>
    </>
  );
}
