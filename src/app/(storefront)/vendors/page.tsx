import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/storefront/page-shell";
import { CatalogPageSkeleton } from "@/components/storefront/skeletons";
import { StudioFeatureCard } from "@/components/storefront/studio-card";
import { getCatalogStats, listProducts, listVendorSummaries } from "@/features/catalog/queries";
import { getServerI18n } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Studios",
  description:
    "Meet the independent ceramicists, leatherworkers, and weavers behind the SupplyHub preview catalog.",
  alternates: { canonical: "/vendors" },
};

export default function VendorsPage() {
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <VendorsContent />
    </Suspense>
  );
}

async function VendorsContent() {
  const [{ t }, stats, vendors] = await Promise.all([
    getServerI18n(),
    getCatalogStats(),
    listVendorSummaries(),
  ]);
  const studios = await Promise.all(
    vendors.map(async (vendor) => ({
      vendor,
      image: (await listProducts({ vendor: vendor.slug, limit: 1 }))[0],
    })),
  );

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">
          {t("vendor.studiosEyebrow", { makers: stats.vendors, objects: stats.products })}
        </p>
        <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[0.98] font-medium tracking-[-0.04em] text-balance sm:text-6xl">
          {t("vendor.headline")}
        </h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-muted-foreground">{t("vendor.intro")}</p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {studios.map(({ vendor, image }, index) =>
          image ? (
            <StudioFeatureCard
              key={vendor.slug}
              vendor={vendor}
              image={image}
              priority={index === 0}
              className="min-h-[24rem]"
            />
          ) : (
            <div key={vendor.slug} className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-2xl font-medium">{vendor.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{vendor.story}</p>
            </div>
          ),
        )}
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-border pt-8 sm:flex-row sm:items-center">
        <div>
          <p className="eyebrow text-muted-foreground">{t("vendor.fullCatalog")}</p>
          <p className="mt-2 font-display text-2xl font-medium tracking-[-0.03em]">
            {t("vendor.followObject")}
          </p>
        </div>
        <Button asChild>
          <Link href="/products">
            {t("common.browseAllObjects")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </PageShell>
  );
}
