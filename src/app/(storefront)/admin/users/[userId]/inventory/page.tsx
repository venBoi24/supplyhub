import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { AdminVendorProfileForm } from "@/components/admin/admin-vendor-profile-form";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { StudioProductForm } from "@/components/vendor/studio-product-form";
import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { formatMoney } from "@/features/catalog/money";
import { listStudioCategoryOptions, listVendorProducts } from "@/features/catalog/vendor-queries";
import { getDatabase } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Manage user store",
  robots: { index: false, follow: false },
};

const uuidSchema = z.uuid();

export default async function AdminUserInventoryPage({
  params,
  searchParams,
}: PageProps<"/admin/users/[userId]/inventory">) {
  const [admin, { userId }, query] = await Promise.all([requireAdmin(), params, searchParams]);
  if (!uuidSchema.safeParse(userId).success) notFound();

  const user = await getDatabase().user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      vendor: {
        select: {
          id: true,
          name: true,
          status: true,
          location: true,
          city: true,
          street: true,
          address: true,
          latitude: true,
          longitude: true,
          discipline: true,
          story: true,
          description: true,
          monogram: true,
        },
      },
    },
  });
  if (!user || !user.vendor) notFound();

  const [products, categories] = await Promise.all([
    listVendorProducts(user.vendor.id),
    listStudioCategoryOptions(),
  ]);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link href="/admin/users" className="text-sm text-accent underline underline-offset-4">
        Back to users
      </Link>
      <div className="mt-6 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">
          Admin assisted store management · {admin.name}
        </p>
        <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em]">
          {user.vendor.name}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {user.name} · {user.email} · Store status: {user.vendor.status}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Help this user set up their store location and product catalog. New products remain drafts
          until they are sent for review and published by an administrator.
        </p>
      </div>

      {query.saved === "1" ? (
        <Notice tone="success" className="mt-6">
          Store profile saved.
        </Notice>
      ) : null}

      <section className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-medium">Store profile & location</h2>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">
          Choose the location and confirm it in the embedded Google Map before saving.
        </p>
        <AdminVendorProfileForm
          user={{ id: user.id, name: user.name }}
          vendor={{
            id: user.vendor.id,
            location: user.vendor.location ?? "",
            city: user.vendor.city ?? "",
            street: user.vendor.street ?? "",
            address: user.vendor.address ?? "",
            latitude: user.vendor.latitude?.toString() ?? "",
            longitude: user.vendor.longitude?.toString() ?? "",
            discipline: user.vendor.discipline ?? "",
            story: user.vendor.story ?? user.vendor.description ?? "",
            monogram: user.vendor.monogram ?? "",
          }}
        />
      </section>

      <section className="mt-8 rounded-xl border border-border bg-surface p-6 sm:p-8">
        <h2 className="font-display text-2xl font-medium">Add a product</h2>
        {categories.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Create an active product category first.
          </p>
        ) : (
          <div className="mt-6">
            <StudioProductForm categories={categories} adminVendorId={user.vendor.id} />
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-muted-foreground">Inventory</p>
            <h2 className="mt-2 font-display text-3xl font-medium">Products for this store</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {products.length} products (up to 200 shown)
          </p>
        </div>
        {products.length ? (
          <ul className="mt-5 space-y-3">
            {products.map((product) => (
              <li key={product.id} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {product.sku} · {product.categoryName} ·{" "}
                      {formatMoney(product.priceCents, product.currency)} · Stock {product.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <ProductStatusBadge status={product.status} />
                    <Button asChild variant="secondary" size="sm">
                      <Link href={`/admin/users/${user.id}/inventory/${product.id}`}>
                        Manage product
                      </Link>
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No products yet. Add the user’s first product above.
          </p>
        )}
      </section>
    </PageShell>
  );
}
