"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/page-shell";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <PageShell className="py-20 sm:py-28">
      <div className="max-w-xl border-t-2 border-clay pt-8">
        <p className="eyebrow text-clay">Something went wrong</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
          We could not load this part of the catalog.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The problem has been recorded. Try again, and if it continues, return to the catalog and
          come back later.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/products">Back to the catalog</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
