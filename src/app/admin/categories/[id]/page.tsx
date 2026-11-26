import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { CategoryArchiveAction } from "@/components/admin/category-archive-action";
import { CategoryForm } from "@/components/admin/category-form";
import { PageShell } from "@/components/storefront/page-shell";
import { Badge } from "@/components/ui/badge";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminCategory } from "@/features/catalog/admin-queries";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

const uuidSchema = z.uuid();

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.manageDepartment"),
    description: t("admin.manageDepartmentMetaDescription"),
    robots: { index: false, follow: false },
  };
}

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCategoryPage({
  params,
  searchParams,
}: PageProps<"/admin/categories/[id]">) {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<CategorySkeleton loadingLabel={t("common.loading")} />}>
      <AdminCategoryContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminCategoryContent({
  params,
  searchParams,
}: {
  params: PageProps<"/admin/categories/[id]">["params"];
  searchParams: PageProps<"/admin/categories/[id]">["searchParams"];
}) {
  const { t } = await getServerI18n();
  const [, routeParams, query] = await Promise.all([requireAdmin(), params, searchParams]);

  if (!uuidSchema.safeParse(routeParams.id).success) {
    notFound();
  }

  const category = await getAdminCategory(routeParams.id);

  if (!category) {
    notFound();
  }

  const saved = searchParamValue(query.saved) === "1";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("admin.departments")}
      </Link>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-b border-border pb-8">
        <h1 className="font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          {category.name}
        </h1>
        <Badge tone={category.status === "ACTIVE" ? "success" : "neutral"}>
          {category.status === "ACTIVE" ? t("admin.status.active") : t("studio.status.archived")}
        </Badge>
      </div>

      {saved ? (
        <Notice tone="success" className="mt-6">
          {t("admin.noticeDepartmentSaved")}
        </Notice>
      ) : null}

      {category.status === "ARCHIVED" ? (
        <Notice tone="warning" className="mt-6">
          {t("admin.noticeDepartmentArchivedState")}
        </Notice>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl border border-border bg-surface p-6 sm:p-8">
          {category.status === "ACTIVE" ? (
            <CategoryForm
              category={{
                id: category.id,
                name: category.name,
                slug: category.slug,
                headline: category.headline,
                description: category.description,
              }}
            />
          ) : (
            <dl className="space-y-5 text-sm">
              <div>
                <dt className="eyebrow text-muted-foreground">{t("studio.handle")}</dt>
                <dd className="mt-1 font-mono text-xs tracking-[0.08em]">
                  /categories/{category.slug}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("admin.fieldHeadline")}</dt>
                <dd className="mt-1">{category.headline || t("admin.none")}</dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("product.description")}</dt>
                <dd className="mt-1 leading-6 whitespace-pre-line">
                  {category.description || t("admin.none")}
                </dd>
              </div>
            </dl>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-6 text-sm">
            <h2 className="font-display text-lg font-medium tracking-[-0.02em]">
              {t("admin.catalogFootprint")}
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <dt className="eyebrow text-muted-foreground">{t("studio.published")}</dt>
                <dd className="mt-1 font-display text-2xl font-medium">
                  {category.publishedCount}
                </dd>
              </div>
              <div>
                <dt className="eyebrow text-muted-foreground">{t("admin.allObjects")}</dt>
                <dd className="mt-1 font-display text-2xl font-medium">{category.productCount}</dd>
              </div>
            </dl>
          </section>

          {category.status === "ACTIVE" ? (
            <section className="rounded-xl border border-border bg-surface p-6">
              <h2 className="font-display text-lg font-medium tracking-[-0.02em]">
                {t("admin.archiveHeading")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {t("admin.archiveHint")}
              </p>
              <div className="mt-4">
                <CategoryArchiveAction
                  categoryId={category.id}
                  publishedCount={category.publishedCount}
                />
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </PageShell>
  );
}

function CategorySkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={loadingLabel}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-[28rem] w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </PageShell>
  );
}

export const instant = false;
