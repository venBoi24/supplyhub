import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { InventoryPanel } from "@/components/vendor/inventory-panel";
import { ProductImagesPanel } from "@/components/vendor/product-images-panel";
import { ProductLifecycleActions } from "@/components/vendor/product-lifecycle-actions";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { MAX_PRODUCT_IMAGES } from "@/features/catalog/constants";
import { centsToDecimalString } from "@/features/catalog/money";
import {
  getVendorProduct,
  listStudioCategoryOptions,
  type StudioProductDetail,
} from "@/features/catalog/vendor-queries";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getServerI18n } from "@/i18n/server";
import type { Translator } from "@/i18n/dictionary";

const uuidSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.editObjectTitle"),
    description: t("studio.editObjectDescription"),
    robots: { index: false, follow: false },
  };
}

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

  const [product, categories, i18n] = await Promise.all([
    getVendorProduct(vendorId, routeParams.id),
    listStudioCategoryOptions(),
    getServerI18n(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<ProductSkeleton />}>
      <StudioProductContent product={product} categories={categories} query={query} t={i18n.t} />
    </Suspense>
  );
}

function StudioProductContent({
  product,
  categories,
  query,
  t,
}: {
  product: StudioProductDetail;
  categories: Array<{ id: string; name: string }>;
  query: Awaited<PageProps<"/vendor/products/[id]">["searchParams"]>;
  t: Translator;
}) {
  const canEdit =
    product.status === "DRAFT" || product.status === "REJECTED" || product.status === "PUBLISHED";
  const saved = searchParamValue(query.saved) === "1";
  const published = searchParamValue(query.published) === "1";

  return (
    <>
      <Link
        href="/vendor/products"
        className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-3.5" aria-hidden="true" />
        {t("studio.backToProducts")}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl leading-none font-semibold tracking-[-0.03em] text-balance sm:text-[1.75rem]">
              {product.name}
            </h1>
            <ProductStatusBadge status={product.status} />
          </div>
          <p className="mt-2 font-mono text-[0.65rem] tracking-[0.08em] text-muted-foreground">
            /products/{product.slug} · {product.sku} · {product.categoryName}
          </p>
        </div>
      </div>

      {saved ? (
        <Notice tone="success" className="mt-4">
          {t("studio.changesSaved")}
        </Notice>
      ) : null}

      {published ? (
        <Notice tone="success" className="mt-4">
          {t("studio.objectIsLive")}
        </Notice>
      ) : null}

      {product.status === "REJECTED" && product.reviewNote ? (
        <Notice tone="danger" className="mt-4">
          <span className="font-medium">{`${t("studio.changesRequestedPrefix")} `}</span>
          {product.reviewNote}
        </Notice>
      ) : null}

      {product.status === "PENDING_REVIEW" ? (
        <Notice tone="info" className="mt-4">
          {t("studio.pendingReviewNotice")}
        </Notice>
      ) : null}

      {product.status === "ARCHIVED" ? (
        <Notice tone="warning" className="mt-4">
          {t("studio.archivedNotice")}
        </Notice>
      ) : null}

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-8">
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
                {t("studio.objectDetails")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {product.status === "PUBLISHED"
                  ? t("studio.publishedEditNote")
                  : t("studio.privateUntilPublish")}
              </p>
              <div className="mt-6">
                <StudioProductForm
                  categories={categories}
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    categoryId: product.categoryId,
                    price: centsToDecimalString(product.priceCents),
                    description: product.description,
                    makerNote: product.makerNote,
                    materials: product.materials,
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
                {t("studio.objectDetails")}
              </h2>
              <dl className="mt-5 grid gap-5 text-sm sm:grid-cols-2">
                <div>
                  <dt className="eyebrow text-muted-foreground">{t("common.price")}</dt>
                  <dd className="mt-1 font-medium">
                    {product.currency} {centsToDecimalString(product.priceCents)}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-muted-foreground">{t("products.department")}</dt>
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
              {t("studio.inventory")}
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
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              {t("studio.publishing")}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {t("studio.publishingNote")}
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
    </>
  );
}

async function ProductSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingObject")}>
      <div className="mb-4">
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="border-b border-border pb-5">
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <Skeleton className="h-[40rem] w-full rounded-xl" />
        <div className="space-y-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
