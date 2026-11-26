import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CategoryForm } from "@/components/admin/category-form";
import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerI18n } from "@/i18n/server";
import { requireAdmin } from "@/server/auth/guards";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("admin.newDepartment"),
    description: t("admin.newDepartmentMetaDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function NewCategoryPage() {
  const { t } = await getServerI18n();

  return (
    <Suspense fallback={<NewCategorySkeleton loadingLabel={t("common.loading")} />}>
      <NewCategoryContent />
    </Suspense>
  );
}

async function NewCategoryContent() {
  const { t } = await getServerI18n();
  await requireAdmin();

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("admin.departments")}
      </Link>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">{t("admin.newDepartment")}</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          {t("admin.createDepartmentTitle")}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("admin.createDepartmentIntro")}
        </p>
      </div>

      <div className="mt-8 max-w-2xl rounded-xl border border-border bg-surface p-6 sm:p-8">
        <CategoryForm />
      </div>
    </PageShell>
  );
}

function NewCategorySkeleton({ loadingLabel }: { loadingLabel: string }) {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={loadingLabel}>
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
        </div>
        <Skeleton className="mt-8 h-96 w-full max-w-2xl rounded-xl" />
      </div>
      <span className="sr-only">{loadingLabel}</span>
    </PageShell>
  );
}

export const instant = false;
