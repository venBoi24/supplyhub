import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/client";

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
  const [{ vendorId }, categories] = await Promise.all([
    requireApprovedVendor("/vendor/products/new"),
    listStudioCategoryOptions(),
  ]);
  const studio = await getDatabase().vendor.findUnique({
    where: { id: vendorId },
    select: { city: true, street: true, address: true, latitude: true, longitude: true },
  });

  return (
    <>
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        Products
      </Link>

      <div className="mt-3 border-b border-border pb-5">
        <p className="eyebrow text-muted-foreground">New object</p>
        <h1 className="mt-2 font-display text-2xl leading-none font-semibold tracking-[-0.03em] text-balance sm:text-[1.75rem]">
          Describe the object.
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          Start with the name, price, and story. The draft stays private to your studio until it is
          submitted and an administrator publishes it.
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="mt-5 rounded-xl border border-border bg-surface px-4 py-6 text-sm text-muted-foreground">
          No departments are open yet. An administrator needs to create a department before you can
          list an object.
        </p>
      ) : (
        <div className="mt-5 max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
          <StudioProductForm
            categories={categories}
            location={{
              city: studio?.city ?? "",
              street: studio?.street ?? "",
              address: studio?.address ?? "",
              latitude: studio?.latitude?.toString() ?? "",
              longitude: studio?.longitude?.toString() ?? "",
            }}
          />
        </div>
      )}
    </>
  );
}

function NewProductSkeleton() {
  return (
    <div role="status" aria-label="Loading the object form">
      <div className="mb-4">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="border-b border-border pb-5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="mt-5 h-[36rem] w-full max-w-3xl rounded-xl" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
