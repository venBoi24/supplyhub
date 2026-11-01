import type { Metadata } from "next";
import { FolderTree, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { listAdminCategories } from "@/features/catalog/admin-queries";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Departments",
  description: "Manage the departments that organize the SupplyHub catalog.",
  robots: { index: false, follow: false },
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AdminCategoriesPage({ searchParams }: PageProps<"/admin/categories">) {
  return (
    <Suspense fallback={<AdminCategoriesSkeleton />}>
      <AdminCategoriesContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AdminCategoriesContent({
  searchParams,
}: {
  searchParams: PageProps<"/admin/categories">["searchParams"];
}) {
  const [admin, query, categories] = await Promise.all([
    requireAdmin(),
    searchParams,
    listAdminCategories(),
  ]);

  const archived = searchParamValue(query.archived) === "1";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Administration</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Departments.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Departments organize the storefront navigation and category pages. Archiving a
            department hides it and its objects from the public catalog.
          </p>
          <p className="mt-3 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
            Signed in as {admin.name}
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          <Plus className="size-4" aria-hidden="true" />
          New department
        </Link>
      </div>

      {archived ? (
        <Notice tone="warning" className="mt-8">
          Department archived. It no longer appears on the storefront.
        </Notice>
      ) : null}

      {categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="size-5" aria-hidden="true" />}
          title="No departments yet."
          description="Create a department before studios can list objects."
          className="mt-8"
        >
          <Link
            href="/admin/categories/new"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
          >
            <Plus className="size-4" aria-hidden="true" />
            Create the first department
          </Link>
        </EmptyState>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-xl border border-border bg-surface">
          {categories.map((category) => (
            <li key={category.id}>
              <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
                      {category.name}
                    </h2>
                    <Badge tone={category.status === "ACTIVE" ? "success" : "neutral"}>
                      {category.status === "ACTIVE" ? "Active" : "Archived"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-[0.6875rem] tracking-[0.1em] text-muted-foreground">
                    /categories/{category.slug}
                  </p>
                  {category.headline ? (
                    <p className="mt-2 text-sm text-muted-foreground">{category.headline}</p>
                  ) : null}
                </div>

                <div className="flex items-center gap-6">
                  <dl className="flex gap-6 text-sm">
                    <div>
                      <dt className="eyebrow text-muted-foreground">Published</dt>
                      <dd className="mt-1 font-display text-xl font-medium">
                        {category.publishedCount}
                      </dd>
                    </div>
                    <div>
                      <dt className="eyebrow text-muted-foreground">All objects</dt>
                      <dd className="mt-1 font-display text-xl font-medium">
                        {category.productCount}
                      </dd>
                    </div>
                  </dl>
                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-border-strong hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}

function AdminCategoriesSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading departments">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-8 space-y-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
