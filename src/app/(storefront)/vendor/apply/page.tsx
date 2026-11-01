import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageShell } from "@/components/storefront/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorApplicationForm } from "@/components/vendors/vendor-application-form";
import { requireActor } from "@/server/auth/guards";
import { canApplyForVendor } from "@/server/auth/policies";

export const metadata: Metadata = {
  title: "Apply for a studio",
  description: "Apply for a vendor workspace on SupplyHub.",
  robots: { index: false, follow: false },
};

const steps = [
  {
    title: "Tell us about your studio",
    description: "A name, a handle for your storefront address, and what you make.",
  },
  {
    title: "An administrator reviews it",
    description: "Every studio is reviewed by hand before it can list objects.",
  },
  {
    title: "Your workspace opens",
    description: "Approved owners receive the vendor role and a studio workspace.",
  },
];

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

  return (
    <PageShell className="pt-10 sm:pt-14">
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to account
      </Link>

      <div className="mt-8 border-b border-border pb-8">
        <p className="eyebrow text-muted-foreground">Studio application</p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
          Apply for a studio.
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
          SupplyHub is a curated registry. Studio applications are reviewed before a workspace
          opens, so take a moment to describe what you make and how you work.
        </p>
      </div>

      <div className="mt-10 grid items-start gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <aside>
          <h2 className="eyebrow text-muted-foreground">How it works</h2>
          <ol className="mt-5 space-y-6">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span
                  aria-hidden="true"
                  className="mt-0.5 font-mono text-xs tracking-[0.14em] text-clay"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-8 border-t border-border pt-6 text-xs leading-5 text-muted-foreground">
            Commission, payout terms, and listing requirements are still being finalized. Applying
            now does not commit you to any terms.
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
            Your studio
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            This becomes your public studio profile once approved.
          </p>
          <div className="mt-6">
            <VendorApplicationForm />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ApplySkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading the studio application">
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
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
