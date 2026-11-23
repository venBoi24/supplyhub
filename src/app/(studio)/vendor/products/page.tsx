import type { Metadata } from "next";
import { Package, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { formatMoney } from "@/features/catalog/money";
import { getStudioProductStats, listVendorProducts } from "@/features/catalog/vendor-queries";
import { getServerI18n } from "@/i18n/server";
import { requireApprovedVendor } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.productsTitle"),
    description: t("studio.productsDescription"),
    robots: { index: false, follow: false },
  };
}

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function StudioProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ProductsSkeleton />}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProductsContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ t }, { vendorId }, params] = await Promise.all([
    getServerI18n(),
    requireApprovedVendor("/vendor/products"),
    searchParams,
  ]);
  const [products, stats] = await Promise.all([
    listVendorProducts(vendorId),
    getStudioProductStats(vendorId),
  ]);

  const published = searchParamValue(params.published) === "1";
  const archived = searchParamValue(params.archived) === "1";
  const deleted = searchParamValue(params.deleted) === "1";

  return (
    <>
      <StudioPageHead
        title={t("studio.products")}
        description={t("studio.catalogSummary", {
          count: stats.total,
          objects: stats.total === 1 ? t("nav.object") : t("nav.objects"),
          published: stats.published,
        })}
        action={
          <Button asChild size="sm">
            <Link href="/vendor/products/new">
              <Plus className="size-4" aria-hidden="true" />
              {t("studio.addObject")}
            </Link>
          </Button>
        }
      />

      {published ? (
        <Notice tone="success" className="mb-4">
          {t("studio.noticePublished")}
        </Notice>
      ) : null}
      {archived ? (
        <Notice tone="warning" className="mb-4">
          {t("studio.noticeArchived")}
        </Notice>
      ) : null}
      {deleted ? (
        <Notice tone="success" className="mb-4">
          {t("studio.noticeDraftDeleted")}
        </Notice>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="size-5" aria-hidden="true" />}
          title={t("studio.noObjectsTitle")}
          description={t("studio.noObjectsBody")}
        >
          <Link
            href="/vendor/products/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("studio.createFirstObject")}
          </Link>
        </EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/vendor/products/${product.id}`}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-surface p-3 transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:flex-nowrap"
              >
                <Image
                  src={product.image?.src ?? "/images/demo/placeholder.jpg"}
                  alt={product.image?.alt ?? ""}
                  width={64}
                  height={64}
                  className="size-16 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{product.name}</p>
                  <p className="mt-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
                    {product.sku} · {product.categoryName}
                  </p>
                </div>
                <div className="flex items-center gap-4 sm:flex-col sm:items-end sm:gap-1.5">
                  <ProductStatusBadge status={product.status} />
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(product.priceCents, product.currency)} ·{" "}
                    {t("studio.unitsOnHand", {
                      count: product.stock,
                      units: product.stock === 1 ? t("common.piece") : t("common.pieces"),
                    })}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

async function ProductsSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingProducts")}>
      <div className="mb-5">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="mt-2 h-3.5 w-64 max-w-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
