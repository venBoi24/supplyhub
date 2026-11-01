import { Compass } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/page-shell";

export default function StorefrontNotFound() {
  return (
    <PageShell className="py-20 sm:py-28">
      <div className="max-w-xl border-t-2 border-clay pt-8">
        <p className="flex items-center gap-2 text-muted-foreground">
          <Compass className="size-4" aria-hidden="true" />
          <span className="eyebrow">404 · Page not found</span>
        </p>
        <h1 className="mt-3 font-display text-3xl leading-tight font-medium tracking-[-0.03em] text-balance sm:text-4xl">
          We could not find that page.
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The object or studio may have moved, or the link may be outdated. Return to the catalog to
          keep browsing.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/products">Browse all objects</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Return home</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
