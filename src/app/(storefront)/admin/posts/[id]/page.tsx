import type { Metadata } from "next";
import { Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AdminPostControls } from "@/components/admin/admin-post-controls";
import { PageShell } from "@/components/storefront/page-shell";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductStatusBadge } from "@/components/vendor/product-status-badge";
import { getAdminProduct, listAdminAuditEventsForTarget } from "@/features/catalog/admin-queries";
import { formatMoney } from "@/features/catalog/money";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata({
  params,
}: PageProps<"/admin/posts/[id]">): Promise<Metadata> {
  const { t } = await getServerI18n();
  const { id } = await params;
  const product = await getAdminProduct(id);
  return {
    title: product ? `${product.name} · ${t("admin.postDetail")}` : t("admin.postDetail"),
    robots: { index: false, follow: false },
  };
}

export default async function AdminPostDetailPage({
  params,
}: PageProps<"/admin/posts/[id]">) {
  const { t } = await getServerI18n();
  return (
    <Suspense fallback={<PageShell className="pt-12">{t("common.loading")}</PageShell>}>
      <AdminPostDetailContent params={params} />
    </Suspense>
  );
}

async function AdminPostDetailContent({ params }: { params: PageProps<"/admin/posts/[id]">["params"] }) {
  await requireAdmin();
  const { t, formatDate, formatNumber } = await getServerI18n();
  const { id } = await params;
  const product = await getAdminProduct(id);

  if (!product) {
    notFound();
  }

  const events = await listAdminAuditEventsForTarget("product", product.id);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <nav aria-label={t("common.breadcrumb")} className="flex flex-wrap items-center gap-2 text-xs">
        <Link href="/admin/posts" className="text-muted-foreground transition-colors hover:text-foreground">
          {t("admin.postManagement")}
        </Link>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="mt-6 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">{t("admin.postDetail")}</p>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-4 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
            {product.sku} · {product.categoryName} · {product.vendorName}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProductStatusBadge status={product.status} />
          {product.featured ? (
            <span className="font-mono text-[0.625rem] tracking-[0.14em] text-clay uppercase">
              {t("common.featured")}
            </span>
          ) : null}
          <Button asChild variant="secondary" size="sm">
            <Link href={`/products/${product.slug}`}>{t("admin.viewPublicPage")}</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {product.images.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {product.images.map((image, index) => (
                <div key={index} className="overflow-hidden rounded-xl border border-border bg-surface-muted">
                  <Image
                    src={image.src}
                    alt={image.alt}
                    width={640}
                    height={640}
                    className="aspect-square w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Package className="size-5" aria-hidden="true" />}
              title={t("admin.productsEmptyTitle")}
              description={t("admin.productsEmptyBody")}
            />
          )}
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">{t("admin.postDetail")}</h2>
            <dl className="mt-4 grid gap-4 text-sm">
              <div>
                <dt className="eyebrow text-muted-foreground">{t("common.price")}</dt>
                <dd className="mt-1 font-medium">
                  {formatMoney(product.priceCents, product.currency)}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("common.quantity")}</dt>
                <dd className="mt-1 font-medium">{formatNumber(product.stock)}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("admin.postPublishedOn")}</dt>
                <dd className="mt-1 font-medium">
                  {product.publishedAt ? formatDate(product.publishedAt) : t("admin.notVerified")}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("admin.postUpdatedOn")}</dt>
                <dd className="mt-1 font-medium">{formatDate(product.updatedAt)}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">{product.summary}</p>
            <p className="mt-4 text-sm leading-6">{product.description}</p>
            {product.reviewNote ? (
              <p className="mt-4 text-sm leading-6 text-muted-foreground">
                <span className="font-medium text-foreground">{t("admin.lastNote")} </span>
                {product.reviewNote}
              </p>
            ) : null}
          </section>

          <AdminPostControls productId={product.id} status={product.status} featured={product.featured} />

          <section className="rounded-xl border border-border bg-surface p-5 sm:p-6">
            <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
              {t("admin.moderationHistory")}
            </h2>
            {events.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t("admin.noModerationHistory")}</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {events.map((event) => (
                  <li key={event.id} className="rounded-lg border border-border bg-surface-muted/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{event.action}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(event.createdAt)}</p>
                    </div>
                    {event.actor ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.actor.name} · {event.actor.email}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </PageShell>
  );
}

export const instant = false;