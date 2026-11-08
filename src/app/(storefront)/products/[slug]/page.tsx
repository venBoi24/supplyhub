import type { Metadata } from "next";
import { Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Price } from "@/components/ui/price";
import { AddToCartForm } from "@/components/storefront/add-to-cart-form";
import { AvailabilityBadge } from "@/components/storefront/availability-badge";
import { MakerLabel } from "@/components/storefront/maker-label";
import { PageShell } from "@/components/storefront/page-shell";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductGrid } from "@/components/storefront/product-grid";
import { SectionHeading } from "@/components/storefront/section-heading";
import { ShareButton } from "@/components/storefront/share-button";
import { ProductDetailSkeleton } from "@/components/storefront/skeletons";
import { VerifiedStudioBadge } from "@/components/storefront/verified-studio-badge";
import { getProductBySlug, getRelatedProducts } from "@/features/catalog/queries";
import type { ProductListing } from "@/features/catalog/types";
import { StudioChatButton } from "@/features/experience/widgets/studio-chat-button";
import { WishlistButton } from "@/features/experience/widgets/wishlist-button";

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    return { title: "Object not found" };
  }

  return {
    title: product.name,
    description: product.summary,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: `${product.name} · ${product.vendor.name}`,
      description: product.summary,
      images: [
        {
          url: product.image.src,
          width: product.image.width,
          height: product.image.height,
          alt: product.image.alt,
        },
      ],
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetail product={product} />
    </Suspense>
  );
}

async function ProductDetail({ product }: { product: ProductListing }) {
  const related = await getRelatedProducts(product.slug, 3);
  const soldOut = product.availability === "sold-out";

  return (
    <PageShell className="pt-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs">
        <Link
          href="/products"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          All objects
        </Link>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        <Link
          href={`/categories/${product.category.slug}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {product.category.name}
        </Link>
        <span aria-hidden="true" className="text-border-strong">
          /
        </span>
        <span aria-current="page" className="text-foreground">
          {product.name}
        </span>
      </nav>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
        <div>
          <ProductGallery images={product.images} name={product.name} soldOut={soldOut} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>
              Made by {product.vendor.name} · {product.vendor.location}
            </p>
            <p className="eyebrow">Studio photography</p>
          </div>
        </div>

        <div className="max-w-xl">
          <div className="flex flex-wrap items-center gap-3">
            <MakerLabel vendor={product.vendor} variant="tag" />
            <VerifiedStudioBadge />
          </div>
          <h1 className="mt-6 font-display text-4xl leading-[0.98] font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Price
              amountCents={product.priceCents}
              compareAtPriceCents={product.compareAtPriceCents}
              currency={product.currency}
              size="lg"
            />
            <AvailabilityBadge availability={product.availability} />
          </div>

          <p className="mt-6 text-base leading-7 text-muted-foreground">{product.summary}</p>

          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm leading-7">{product.description}</p>
          </div>

          <div className="mt-8">
            {soldOut ? (
              <div className="rounded-xl border border-border bg-surface-muted/60 p-5">
                <p className="font-display text-lg font-medium tracking-[-0.02em]">
                  This piece has found a home.
                </p>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  The listing is no longer available. Explore related objects from the studio below.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button asChild variant="secondary">
                    <Link href={`/vendors/${product.vendor.slug}`}>
                      Visit {product.vendor.name}
                    </Link>
                  </Button>
                  <ShareButton />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-4">
                  <div className="min-w-0 flex-1">
                    <AddToCartForm productId={product.id} available={product.inventory} />
                  </div>
                  <ShareButton className="h-12" />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Checkout reserves stock and opens LynxPay payment in Tanzanian shillings.
                </p>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <WishlistButton
              className="size-11 rounded-lg"
              item={{
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                inventory: product.inventory,
                image: product.image.src,
                currency: product.currency,
              }}
            />
            <StudioChatButton vendorSlug={product.vendor.slug} vendorName={product.vendor.name} />
            <Link
              href="/experience"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0f766e]/30 bg-[#0f766e]/5 px-4 py-2.5 text-sm font-semibold text-[#0f766e] transition hover:bg-[#0f766e]/10"
            >
              <ShieldCheck className="size-4" aria-hidden="true" /> Buyer protection
            </Link>
          </div>

          <div className="mt-8 border-t border-border">
            {product.materials.length > 0 || product.dimensions ? (
              <details open className="group border-b border-border py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  Materials &amp; dimensions
                  <Plus
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <div className="mt-3 space-y-1.5 text-sm leading-6 text-muted-foreground">
                  {product.materials.length > 0 ? <p>{product.materials.join(", ")}</p> : null}
                  {product.dimensions ? <p>{product.dimensions}</p> : null}
                </div>
              </details>
            ) : null}

            {product.care ? (
              <details className="group border-b border-border py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  Care
                  <Plus
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                    aria-hidden="true"
                  />
                </summary>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{product.care}</p>
              </details>
            ) : null}

            <details className="group border-b border-border py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                The studio
                <Plus
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <div className="mt-3 text-sm leading-6 text-muted-foreground">
                <p>{product.vendor.story}</p>
                <Link
                  href={`/vendors/${product.vendor.slug}`}
                  className="mt-3 inline-flex w-fit items-center gap-1.5 font-medium text-accent underline-offset-4 hover:underline"
                >
                  Visit {product.vendor.name}
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </details>
          </div>

          {product.makerNote ? (
            <blockquote className="mt-8 border-l-2 border-clay bg-paper px-5 py-4 text-paper-foreground">
              <p className="eyebrow text-clay">Studio note</p>
              <p className="mt-2 text-sm leading-6">{product.makerNote}</p>
            </blockquote>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16 border-t border-border pt-10 sm:mt-20">
          <SectionHeading
            eyebrow="Keep looking"
            title="In the same orbit"
            description="Related by department or studio. Every object has a maker, and every maker has more to see."
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href={`/categories/${product.category.slug}`}>
                  More {product.category.name.toLowerCase()}
                </Link>
              </Button>
            }
          />
          <div className="mt-8">
            <ProductGrid products={related} />
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}
