import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorApplicationForm } from "@/components/vendors/vendor-application-form";
import { listStudioCategoryOptions } from "@/features/catalog/vendor-queries";
import { getAccountProfile } from "@/features/identity/queries";
import { requireActor } from "@/server/auth/guards";
import { canApplyForVendor } from "@/server/auth/policies";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("vendor.applyMetaTitle"),
    description: t("vendor.applyMetaDescription"),
    robots: { index: false, follow: false },
  };
}

const stepKeys = [
  { titleKey: "vendor.applyStep1Title", copyKey: "vendor.applyStep1Body" },
  { titleKey: "vendor.applyStep2Title", copyKey: "vendor.applyStep2Body" },
  { titleKey: "vendor.applyStep3Title", copyKey: "vendor.applyStep3Body" },
] as const;

export default function VendorApplyPage() {
  return (
    <Suspense fallback={<ApplySkeleton />}>
      <ApplyContent />
    </Suspense>
  );
}

async function ApplyContent() {
  const actor = await requireActor("/vendor/apply");

  if (actor.vendor) {
    redirect("/vendor");
  }

  if (!canApplyForVendor(actor)) {
    redirect("/account?denied=vendor");
  }

  const [{ t }, departments, profile] = await Promise.all([
    getServerI18n(),
    listStudioCategoryOptions(),
    getAccountProfile(actor.id),
  ]);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {t("vendor.backToAccount")}
      </Link>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">{t("vendor.applicationEyebrow")}</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          {t("vendor.applyTitle")}
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          {t("vendor.applyIntro")}
        </p>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <aside>
          <h2 className="eyebrow text-muted-foreground">{t("vendor.howItWorks")}</h2>
          <ol className="mt-5 space-y-6">
            {stepKeys.map(({ titleKey, copyKey }, index) => (
              <li key={titleKey} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-mono text-xs tracking-[0.14em] text-clay"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-medium">{t(titleKey)}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{t(copyKey)}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-8 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
            {t("vendor.termsNote")}
          </p>
        </aside>

        <section
          aria-labelledby="vendor-application-heading"
          className="rounded-xl border border-border bg-surface p-6 sm:p-8"
        >
          <h2
            id="vendor-application-heading"
            className="font-display text-2xl font-medium tracking-[-0.02em]"
          >
            {t("vendor.yourStudioHeading")}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {t("vendor.publicProfileNote")}
          </p>
          <div className="mt-6">
            <VendorApplicationForm departments={departments} defaultPhone={profile?.phone ?? ""} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

async function ApplySkeleton() {
  const { t } = await getServerI18n();
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={t("vendor.loadingApplication")}>
        <Skeleton className="h-4 w-32" />
        <div className="mt-8 border-b border-border pb-8">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="mt-4 h-12 w-80 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-xl" />
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="space-y-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
      <span className="sr-only">{t("common.loading")}</span>
    </PageShell>
  );
}

export const instant = false;
