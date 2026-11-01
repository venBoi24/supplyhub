import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageShell } from "@/components/storefront/page-shell";
import { InventoryPanel } from "@/components/vendor/inventory-panel";
import { ProductImagesPanel } from "@/components/vendor/product-images-panel";
import { ProductLifecycleActions } from "@/components/vendor/product-lifecycle-actions";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { MAX_PRODUCT_IMAGES } from "@/features/catalog/constants";
import { centsToDecimalString } from "@/features/catalog/money";
import { getVendorProduct, listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { getDatabase } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Manage product",
  robots: { index: false, follow: false },
};

const uuidSchema = z.uuid();

export default async function AdminManagedProductPage({
  params,
}: PageProps<"/admin/users/[userId]/inventory/[productId]">) {
  await requireAdmin();
  const { userId, productId } = await params;
  if (!uuidSchema.safeParse(userId).success || !uuidSchema.safeParse(productId).success) notFound();

  const user = await getDatabase().user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, vendor: { select: { id: true, name: true } } },
  });
  if (!user?.vendor) notFound();

  const [product, categories] = await Promise.all([
    getVendorProduct(user.vendor.id, productId),
    listStudioCategoryOptions(),
  ]);
  if (!product) notFound();
  const canEdit =
    product.status === "DRAFT" || product.status === "REJECTED" || product.status === "PUBLISHED";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href={`/admin/users/${user.id}/inventory`}
        className="text-sm text-accent underline underline-offset-4"
      >
        Back to {user.vendor.name} inventory
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-b border-border pb-6">
        <h1 className="font-display text-4xl font-medium tracking-[-0.04em]">{product.name}</h1>
        <ProductStatusBadge status={product.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Managed for {user.name} · {user.email}
      </p>
      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="space-y-8">
          {canEdit ? (
            <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
              <h2 className="font-display text-2xl font-medium">Product details</h2>
              <div className="mt-6">
                <StudioProductForm
                  categories={categories}
                  adminVendorId={user.vendor.id}
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
          ) : null}
          <section className="rounded-xl border border-border bg-surface p-6 sm:p-8">
            <InventoryPanel
              productId={product.id}
              stock={product.stock}
              movements={product.movements}
              canAdjust={product.status !== "ARCHIVED"}
              adminVendorId={user.vendor.id}
            />
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="font-display text-xl font-medium">Publishing</h2>
            <div className="mt-4">
              <ProductLifecycleActions
                productId={product.id}
                status={product.status}
                publicHref={`/products/${product.slug}`}
                imageCount={product.images.length}
                adminVendorId={user.vendor.id}
              />
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-6">
            <ProductImagesPanel
              productId={product.id}
              images={product.images}
              canEdit={canEdit}
              limitReached={product.images.length >= MAX_PRODUCT_IMAGES}
              adminVendorId={user.vendor.id}
            />
          </section>
        </aside>
      </div>
    </PageShell>
  );
}
