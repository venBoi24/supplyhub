"use client";

import Link from "next/link";
import { useEffect } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <PageShell className="flex min-h-dvh flex-col justify-center py-20 sm:py-28">
      <div className="max-w-xl border-t-2 border-clay pt-8">
        <p className="eyebrow text-clay">Something went wrong</p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
          We could not load this page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The problem has been recorded. Try again, and if it continues, come back later.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button asChild variant="secondary">
            <Link href="/">Back to SupplyHub</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
