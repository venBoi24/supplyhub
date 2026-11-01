import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioNav } from "@/components/vendor/studio-nav";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { requireApprovedVendor } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "New object",
  description: "Add an object to your SupplyHub studio.",
  robots: { index: false, follow: false },
};

export default function NewStudioProductPage() {
  return (
    <Suspense fallback={<NewProductSkeleton />}>
      <NewProductContent />
    </Suspense>
  );
}

async function NewProductContent() {
  await requireApprovedVendor("/vendor/products/new");
  const categories = await listStudioCategoryOptions();

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/vendor"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Studio objects
      </Link>

      <div className="mt-6">
        <StudioNav />
      </div>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">New object</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          Describe the object.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Start with the name, price, and story. The draft stays private to your studio until it is
          submitted and an administrator publishes it.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="mt-8 rounded-md border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No departments are open yet. An administrator needs to create a department before you can
          list an object.
        </p>
      ) : (
        <div className="mt-8 max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
          <StudioProductForm categories={categories} />
        </div>
      )}
    </PageShell>
  );
}

function NewProductSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the object form">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="mt-8 h-[36rem] w-full max-w-3xl rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
