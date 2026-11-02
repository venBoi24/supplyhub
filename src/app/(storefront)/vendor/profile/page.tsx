import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioNav } from "@/components/vendor/studio-nav";
import { StudioProfileForm } from "@/components/vendor/studio-profile-form";
import { getVendorForOwner } from "@/features/vendors/queries";
import { listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { initialsFor } from "@/lib/utils/initials";
import { requireApprovedVendor } from "@/server/auth/guards";

export const metadata: Metadata = {
  title: "Studio profile",
  description: "Edit the public profile for your SupplyHub studio.",
  robots: { index: false, follow: false },
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function StudioProfilePage({ searchParams }: PageProps<"/vendor/profile">) {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ProfileContent({
  searchParams,
}: {
  searchParams: PageProps<"/vendor/profile">["searchParams"];
}) {
  const [{ actor, vendorId }, query] = await Promise.all([
    requireApprovedVendor("/vendor/profile"),
    searchParams,
  ]);

  const [vendor, departments] = await Promise.all([
    getVendorForOwner(actor.id),
    listStudioCategoryOptions(),
  ]);

  if (!vendor || vendor.id !== vendorId) {
    redirect("/vendor");
  }

  const saved = searchParamValue(query.saved) === "1";

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/vendor"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Studio objects
      </Link>

      <div className="mt-6">
        <StudioNav />
      </div>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Studio profile</p>
        <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          {vendor.name}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          This is what customers read on your public studio page at{" "}
          <span className="font-mono text-xs tracking-[0.06em]">/vendors/{vendor.slug}</span>.
        </p>
      </div>

      {saved ? (
        <Notice tone="success" className="mt-6">
          Studio profile saved.
        </Notice>
      ) : null}

      <div className="mt-8 max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
        <StudioProfileForm
          departments={departments}
          defaults={{
            location: vendor.location ?? "",
            city: vendor.city ?? "",
            street: vendor.street ?? "",
            address: vendor.address ?? "",
            latitude: vendor.latitude?.toString() ?? "",
            longitude: vendor.longitude?.toString() ?? "",
            discipline: vendor.discipline ?? "",
            contactPhone: vendor.contactPhone ?? "",
            departmentIds: vendor.departments.map((department) => department.categoryId),
            story: vendor.story ?? vendor.description ?? "",
            monogram: vendor.monogram ?? initialsFor(vendor.name),
          }}
        />
      </div>
    </PageShell>
  );
}

function ProfileSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the studio profile">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="mt-8 h-[28rem] w-full max-w-3xl rounded-xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
