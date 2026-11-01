import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageShell } from "@/components/storefront/page-shell";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryPanel } from "@/components/vendor/inventory-panel";
import { ProductImagesPanel } from "@/components/vendor/product-images-panel";
import { ProductLifecycleActions } from "@/components/vendor/product-lifecycle-actions";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioNav } from "@/components/vendor/studio-nav";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { MAX_PRODUCT_IMAGES } from "@/features/catalog/constants";
import { centsToDecimalString } from "@/features/catalog/money";
import {
  getVendorProduct,
  listStudioCategoryOptions,
  type StudioProductDetail,
} from "@/features/catalog/vendor-queries";
import { requireApprovedVendor } from "@/server/auth/guards";

const uuidSchema = z.uuid();

export const metadata: Metadata = {
  title: "Edit object",
  description: "Manage an object in your SupplyHub studio.",
  robots: { index: false, follow: false },
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StudioProductPage({
  params,
  searchParams,
}: PageProps<"/vendor/products/[id]">) {
  const [{ vendorId }, routeParams, query] = await Promise.all([
    requireApprovedVendor(),
    params,
    searchParams,
  ]);

  if (!uuidSchema.safeParse(routeParams.id).success) {
    notFound();
  }

  const [product, categories] = await Promise.all([
    getVendorProduct(vendorId, routeParams.id),
    listStudioCategoryOptions(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <StudioProductContent product={product} categories={categories} query={query} />
    </Suspense>
  );
}

function StudioProductContent({
  product,
  categories,
  query,
}: {
  product: StudioProductDetail;
  categories: Array<{ id: string; name: string }>;
  query: Awaited<PageProps<"/vendor/products/[id]">["searchParams"]>;
}) {
  const canEdit =
    product.status === "DRAFT" || product.status === "REJECTED" || product.status === "PUBLISHED";
  const saved = searchParamValue(query.saved) === "1";

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

      <div className="mt-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
              {product.name}
            </h1>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="mt-3 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
            /products/{product.slug} · {product.sku} · {product.categoryName}
          </p>
        </div>
      </div>

      {saved ? (
        <Notice tone="success" className="mt-6">
          Changes saved.
        </Notice>
      ) : null}

      {product.status === "REJECTED" && product.reviewNote ? (
        <Notice tone="danger" className="mt-6">
          <span className="font-medium">Changes requested: </span>
          {product.reviewNote}
        </Notice>
      ) : null}

      {product.status === "PENDING_REVIEW" ? (
        <Notice tone="info" className="mt-6">
          This object is waiting for review. Editing and image uploads are paused until an
          administrator decides. Stock can still be adjusted.
        </Notice>
      ) : null}

      {product.status === "ARCHIVED" ? (
        <Notice tone="warning" className="mt-6">
          This object is archived and no longer visible on the storefront.
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-12">
        <div className="min-w-0">
          {canEdit ? (
            <section
              aria-labelledby="object-details-heading"
              className="rounded-xl border border-border bg-surface p-6 sm:p-8"
            >
              <h2
                id="object-details-heading"
                className="font-display text-xl font-medium tracking-[-0.02em]"
              >
                Object details
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {product.status === "PUBLISHED"
                  ? "Saved changes to a published object appear on the storefront immediately."
                  : "These details stay private until the object is published."}
              </p>
              <div className="mt-6">
                <StudioProductForm
                  categories={categories}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    categoryId: product.categoryId,
                    sku: product.sku,
                    price: centsToDecimalString(product.priceCents),
                    compareAtPrice:
                      product.compareAtPriceCents !== null
                        ? centsToDecimalString(product.compareAtPriceCents)
                        : "",
                    summary: product.summary,
                    description: product.description,
                    makerNote: product.makerNote,
                    materials: product.materials,
                    dimensions: product.dimensions,
                    care: product.care,
                  }}
                />
              </div>
            </section>
          ) : (
            <section
              aria-labelledby="object-details-heading"
              className="rounded-xl border border-border bg-surface p-6 sm:p-8"
            >
              <h2
                id="object-details-heading"
                className="font-display text-xl font-medium tracking-[-0.02em]"
              >
                Object details
              </h2>
              <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="eyebrow text-muted-foreground">Price</dt>
                  <dd className="mt-1 font-medium">
                    {product.currency} {centsToDecimalString(product.priceCents)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted-foreground">Department</dt>
                  <dd className="mt-1 font-medium">{product.categoryName}</dd>
                </div>
              </dl>
              <p className="mt-6 border-t border-border pt-5 leading-6 whitespace-pre-line">
                {product.description}
              </p>
            </section>
          )}

          <section
            aria-labelledby="inventory-heading"
            className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <span id="inventory-heading" className="sr-only">
              Inventory
            </span>
            <InventoryPanel
              productId={product.id}
              stock={product.stock}
              movements={product.movements}
              canAdjust={product.status !== "ARCHIVED"}
            />
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Publishing</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Submit the draft for review, archive it, or remove it entirely.
            </p>
            <div className="mt-5">
              <ProductLifecycleActions
                productId={product.id}
                status={product.status}
                publicHref={`/products/${product.slug}`}
                imageCount={product.images.length}
              />
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-6">
            <ProductImagesPanel
              productId={product.id}
              images={product.images}
              canEdit={canEdit}
              limitReached={product.images.length >= MAX_PRODUCT_IMAGES}
            />
          </section>
        </aside>
      </div>
    </PageShell>
  );
}

function ProductSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the object">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-96 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          <Skeleton className="h-[40rem] w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
