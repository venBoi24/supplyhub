import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";

function ProductCardSkeleton() {
  return (
    <div>
      <Skeleton className="media-square w-full rounded-xl" />
      <Skeleton className="mt-3 h-4 w-20" />
      <Skeleton className="mt-2 h-4 w-3/4" />
      <Skeleton className="mt-1.5 h-3 w-full" />
      <Skeleton className="mt-3 h-3 w-1/2" />
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-4">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function CatalogPageSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the catalog">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-12 w-64 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-lg" />
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border py-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="py-8">
          <ProductGridSkeleton />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}

export function HomePageSkeleton() {
  return (
    <div role="status" aria-label="Loading the storefront">
      <PageShell className="grid gap-10 pt-10 pb-14 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:pt-20 lg:pb-20">
        <div>
          <Skeleton className="h-3 w-56" />
          <Skeleton className="mt-6 h-16 w-full max-w-lg" />
          <Skeleton className="mt-3 h-16 w-4/5 max-w-md" />
          <Skeleton className="mt-7 h-4 w-full max-w-md" />
          <Skeleton className="mt-3 h-4 w-2/3 max-w-sm" />
          <div className="mt-8 flex flex-wrap gap-3">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-36" />
          </div>
        </div>
        <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      </PageShell>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function SiteHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md"
    >
      <div className="h-8 bg-primary" />
      <PageShell className="flex h-16 items-center gap-3">
        <Skeleton className="h-8 w-32" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="hidden h-9 w-64 md:block" />
          <Skeleton className="size-10" />
        </div>
      </PageShell>
    </div>
  );
}

export function SiteFooterSkeleton() {
  return <div aria-hidden="true" className="mt-20 h-72 border-t border-border bg-primary" />;
}

export function ProductDetailSkeleton() {
  return (
    <PageShell className="py-8 sm:py-12">
      <div
        role="status"
        aria-label="Loading this object"
        className="grid gap-10 lg:grid-cols-2 lg:gap-16"
      >
        <div className="flex flex-col gap-3">
          <Skeleton className="media-square w-full rounded-xl" />
          <div className="flex gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="size-16 rounded-lg sm:size-20" />
            ))}
          </div>
        </div>
        <div className="max-w-xl">
          <Skeleton className="h-14 w-36" />
          <Skeleton className="mt-6 h-12 w-3/4" />
          <Skeleton className="mt-4 h-6 w-24" />
          <Skeleton className="mt-6 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
          <Skeleton className="mt-8 h-12 w-full max-w-sm" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
