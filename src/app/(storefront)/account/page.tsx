import type { Metadata } from "next";
import { KeyRound, MailCheck, PackageSearch, Store } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { BuyerWelcomePanel } from "@/components/storefront/buyer-welcome-panel";
import { PageShell } from "@/components/storefront/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { Skeleton } from "@/components/ui/skeleton";
import { VendorStatusBadge } from "@/components/vendors/vendor-status-badge";
import {
  resendVerificationAction,
  signOutAction,
  signOutEverywhereAction,
} from "@/features/identity/actions";
import { getAccountProfile } from "@/features/identity/queries";
import { requireActor } from "@/server/auth/guards";
import type { UserRole } from "@/generated/prisma/enums";
import { formatDate } from "@/lib/utils/format-date";
import { initialsFor } from "@/lib/utils/initials";

export const metadata: Metadata = {
  title: "Your account",
  description: "Manage your SupplyHub account, email verification, and studio application.",
  robots: { index: false, follow: false },
};

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: "Customer",
  VENDOR: "Studio owner",
  ADMIN: "Administrator",
};

function searchParamValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Suspense fallback={<AccountSkeleton />}>
      <AccountContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AccountContent({
  searchParams,
}: {
  searchParams: PageProps<"/account">["searchParams"];
}) {
  const actor = await requireActor("/account");
  const [params, profile] = await Promise.all([searchParams, getAccountProfile(actor.id)]);

  if (!profile) {
    redirect("/sign-in?next=/account");
  }

  const welcome = searchParamValue(params.welcome) === "1";
  const verified = searchParamValue(params.verified) === "1";
  const verification = searchParamValue(params.verification);
  const denied = searchParamValue(params.denied);
  const firstName = profile.name.split(/\s+/)[0] || profile.name;
  const showWelcome = profile.role === "CUSTOMER" && (welcome || !profile.emailVerifiedAt);

  return (
    <PageShell className="pt-10 sm:pt-14">
      <div className="flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="eyebrow text-muted-foreground">Account</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            Good to see you, {firstName}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            Your profile, email verification, orders, and studio status in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{roleLabels[profile.role]}</Badge>
          <Badge tone={profile.status === "ACTIVE" ? "success" : "danger"}>
            {profile.status === "ACTIVE" ? "Active" : "Suspended"}
          </Badge>
          {profile.emailVerifiedAt ? <Badge tone="neutral">Email verified</Badge> : null}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {verified ? (
          <Notice tone="success">Your email address is verified. Thank you.</Notice>
        ) : null}
        {verification === "sent" ? (
          <Notice tone="success">
            Verification email sent. Check your inbox for the link, which expires in 24 hours.
          </Notice>
        ) : null}
        {verification === "slow-down" ? (
          <Notice tone="warning">
            You requested verification emails too often. Wait a little while before trying again.
          </Notice>
        ) : null}
        {verification === "invalid" ? (
          <Notice tone="warning">
            That verification link is invalid or has expired. Request a new one below.
          </Notice>
        ) : null}
        {denied === "admin" ? (
          <Notice tone="warning">Administrator access is required for that page.</Notice>
        ) : null}
        {denied === "vendor" ? (
          <Notice tone="warning">
            Only customer accounts without an existing studio can apply for a vendor workspace.
          </Notice>
        ) : null}
        {denied === "checkout" ? (
          <Notice tone="warning">
            Only customer accounts can place orders. Studio and administrator accounts keep their
            operational role.
          </Notice>
        ) : null}
      </div>

      {showWelcome ? (
        <BuyerWelcomePanel firstName={firstName} emailVerified={Boolean(profile.emailVerifiedAt)} />
      ) : null}

      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
        <div className="space-y-6">
          <section
            aria-labelledby="account-identity"
            className="rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <h2 id="account-identity" className="eyebrow text-muted-foreground">
              Identity
            </h2>
            <div className="mt-5 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="grid size-14 place-items-center rounded-[5px] border border-clay/30 bg-paper font-display text-lg font-semibold text-clay"
              >
                {initialsFor(profile.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-xl font-medium tracking-[-0.02em]">
                  {profile.name}
                </p>
                <p className="truncate text-sm text-muted-foreground">{profile.email}</p>
              </div>
            </div>

            <dl className="mt-7 space-y-3.5 border-t border-border pt-6 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Account type</dt>
                <dd className="font-medium">{roleLabels[profile.role]}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{profile.phone || "Not added"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Member since</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">Email status</dt>
                <dd className="font-medium">
                  {profile.emailVerifiedAt ? "Verified" : "Not verified"}
                </dd>
              </div>
            </dl>
          </section>

          <section
            aria-labelledby="account-orders"
            className="rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="account-orders" className="eyebrow text-muted-foreground">
                  Orders
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  Every checkout records the prices and stock checked at that moment. Reservations
                  release automatically when they expire.
                </p>
              </div>
              <PackageSearch
                className="mt-1 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/account/orders">View your orders</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/cart">Open your cart</Link>
              </Button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section
            aria-labelledby="account-email"
            className="rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-email"
                  className="font-display text-xl font-medium tracking-[-0.02em]"
                >
                  Email verification
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  A verified address keeps password recovery and account notices working.
                </p>
              </div>
              <MailCheck
                className="mt-1 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            {profile.emailVerifiedAt ? (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge tone="success">Verified</Badge>
                <span>Confirmed {formatDate(profile.emailVerifiedAt)}</span>
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <Notice tone="warning">
                  This address is not verified yet. Request a link and open it within 24 hours.
                </Notice>
                <form action={resendVerificationAction}>
                  <SubmitButton
                    pendingLabel="Sending…"
                    variant="secondary"
                    size="sm"
                    className="w-auto"
                  >
                    Send verification email
                  </SubmitButton>
                </form>
              </div>
            )}
          </section>

          <section
            aria-labelledby="account-studio"
            className="rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-studio"
                  className="font-display text-xl font-medium tracking-[-0.02em]"
                >
                  Studio
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  Vendor workspaces are reviewed by a SupplyHub administrator before activation.
                </p>
              </div>
              <Store className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            {profile.vendor ? (
              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{profile.vendor.name}</p>
                  <VendorStatusBadge status={profile.vendor.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Applied {formatDate(profile.vendor.createdAt)}
                </p>
                <Button asChild variant="secondary" size="sm" className="w-fit">
                  <Link href="/vendor">Open studio workspace</Link>
                </Button>
              </div>
            ) : profile.role === "CUSTOMER" ? (
              <div className="mt-5 space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  You can apply for a studio at any time. Tell us what you make, and an
                  administrator reviews the application before selling tools open. Your buyer
                  account keeps its orders and checkout while the application is reviewed.
                </p>
                <Button asChild size="sm" className="w-fit">
                  <Link href="/vendor/apply">Apply for a studio</Link>
                </Button>
              </div>
            ) : (
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                Studio workspaces are managed by administrators. This account cannot submit a studio
                application.
              </p>
            )}
          </section>

          <section
            aria-labelledby="account-security"
            className="rounded-xl border border-border bg-surface p-6 sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="account-security"
                  className="font-display text-xl font-medium tracking-[-0.02em]"
                >
                  Security
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  Sessions last seven days. Resetting your password ends every other session.
                </p>
              </div>
              <KeyRound className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/forgot-password">Send a password reset link</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium">Sessions</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Sign out here, or end every session including other devices.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={signOutAction}>
                  <SubmitButton
                    pendingLabel="Signing out…"
                    variant="secondary"
                    size="sm"
                    className="w-auto"
                  >
                    Sign out
                  </SubmitButton>
                </form>
                <form action={signOutEverywhereAction}>
                  <SubmitButton
                    pendingLabel="Ending sessions…"
                    variant="ghost"
                    size="sm"
                    className="w-auto"
                  >
                    Sign out everywhere
                  </SubmitButton>
                </form>
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}

function AccountSkeleton() {
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label="Loading your account">
        <div className="border-b border-border pb-8">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-12 w-72 max-w-full" />
          <Skeleton className="mt-4 h-4 w-full max-w-lg" />
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <Skeleton className="h-72 w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-44 w-full rounded-xl" />
            <Skeleton className="h-52 w-full rounded-xl" />
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </PageShell>
  );
}
