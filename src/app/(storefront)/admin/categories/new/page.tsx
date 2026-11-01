import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { CategoryForm } from "@/components/admin/category-form";
import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAdmin } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "New department",
  description: "Create a department for the SupplyHub catalog.",
  robots: { index: false, follow: false },
};

export default function NewCategoryPage() {
  return (
    <Suspense fallback={<NewCategorySkeleton />}>
      <NewCategoryContent />
    </Suspense>
  );
}

async function NewCategoryContent() {
  await requireAdmin();

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/admin/categories"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Departments
      </Link>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">New department</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          Create a department.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          Departments appear in the storefront navigation and group objects into browsable
          collections.
        </p>
      </div>

      <div className="mt-8 max-w-2xl rounded-xl border border-border bg-surface p-6 sm:p-8">
        <CategoryForm />
      </div>
    </PageShell>
  );
}

function NewCategorySkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the department form">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
        </div>
        <Skeleton className="mt-8 h-96 w-full max-w-2xl rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
