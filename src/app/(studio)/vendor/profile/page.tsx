import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { StudioPageHead } from "@/components/vendor/studio-page-head";
import { StudioProfileForm } from "@/components/vendor/studio-profile-form";
import { listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { getVendorForOwner } from "@/features/vendors/queries";
import { initialsFor } from "@/lib/utils/initials";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("studio.profile"),
    description: t("studio.profileDescription"),
    robots: { index: false, follow: false },
  };
}

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
  const [{ t }, { actor, vendorId }, query] = await Promise.all([
    getServerI18n(),
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
    <>
      <StudioPageHead
        title={t("studio.profile")}
        description={t("studio.profileIntro", { slug: vendor.slug })}
      />

      {saved ? (
        <Notice tone="success" className="mb-4">
          {t("studio.profileSaved")}
        </Notice>
      ) : null}

      <div className="max-w-3xl rounded-xl border border-border bg-surface p-6 sm:p-8">
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
    </>
  );
}

async function ProfileSkeleton() {
  const { t } = await getServerI18n();

  return (
    <div role="status" aria-label={t("studio.loadingProfile")}>
      <div className="mb-5">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-3.5 w-80 max-w-full" />
      </div>
      <Skeleton className="h-[28rem] w-full max-w-3xl rounded-xl" />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}

export const instant = false;
