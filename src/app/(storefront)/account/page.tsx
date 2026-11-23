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
import { getServerI18n } from "@/i18n/server";
import type { UserRole } from "@/generated/prisma/enums";
import { initialsFor } from "@/lib/utils/initials";

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  CUSTOMER: "account.role.customer",
  VENDOR: "account.role.vendor",
  ADMIN: "account.role.admin",
};

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: t("account.metaTitle"),
    description: t("account.metaDescription"),
    robots: { index: false, follow: false },
  };
}

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

async function AccountSkeleton() {
  const { t } = await getServerI18n();
  return (
    <PageShell className="pt-10 sm:pt-14">
      <div role="status" aria-label={t("account.loadingAccount")}>
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
      <span className="sr-only">{t("common.loading")}</span>
    </PageShell>
  );
}

async function AccountContent({
  searchParams,
}: {
  searchParams: PageProps<"/account">["searchParams"];
}) {
  const [{ t, formatDate }, actor] = await Promise.all([getServerI18n(), requireActor("/account")]);
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
          <p className="eyebrow text-muted-foreground">{t("account.eyebrow")}</p>
          <h1 className="mt-3 font-display text-4xl leading-none font-medium tracking-[-0.04em] text-balance sm:text-5xl">
            {t("account.greeting", { name: firstName })}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">
            {profile.role === "VENDOR" && profile.vendor
              ? t("account.subtitleWithStudio")
              : t("account.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">{t(ROLE_LABEL_KEYS[profile.role])}</Badge>
          <Badge tone={profile.status === "ACTIVE" ? "success" : "danger"}>
            {profile.status === "ACTIVE" ? t("account.active") : t("account.suspended")}
          </Badge>
          {profile.emailVerifiedAt ? (
            <Badge tone="neutral">{t("account.emailVerified")}</Badge>
          ) : null}
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {verified ? <Notice tone="success">{t("account.noticeVerifiedEmail")}</Notice> : null}
        {verification === "sent" ? (
          <Notice tone="success">{t("account.noticeEmailSent")}</Notice>
        ) : null}
        {verification === "slow-down" ? (
          <Notice tone="warning">{t("account.noticeTooManyEmails")}</Notice>
        ) : null}
        {verification === "invalid" ? (
          <Notice tone="warning">{t("account.noticeLinkInvalid")}</Notice>
        ) : null}
        {denied === "admin" ? <Notice tone="warning">{t("account.noticeAdminOnly")}</Notice> : null}
        {denied === "vendor" ? (
          <Notice tone="warning">{t("account.noticeVendorApplyOnly")}</Notice>
        ) : null}
        {denied === "checkout" ? (
          <Notice tone="warning">{t("account.noticeCheckoutCustomerOnly")}</Notice>
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
              {t("account.identityHeading")}
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
                <dt className="text-muted-foreground">{t("account.accountTypeLabel")}</dt>
                <dd className="font-medium">{t(ROLE_LABEL_KEYS[profile.role])}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("account.phoneLabel")}</dt>
                <dd className="font-medium">{profile.phone || t("account.notAdded")}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("account.memberSinceLabel")}</dt>
                <dd className="font-medium">{formatDate(profile.createdAt)}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-muted-foreground">{t("account.emailStatusLabel")}</dt>
                <dd className="font-medium">
                  {profile.emailVerifiedAt ? t("common.verified") : t("account.notVerified")}
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
                  {t("account.ordersHeading")}
                </h2>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {t("account.ordersBody")}
                </p>
              </div>
              <PackageSearch
                className="mt-1 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/account/orders">{t("account.viewYourOrders")}</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/cart">{t("account.openYourCart")}</Link>
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
                  {t("account.emailVerificationHeading")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {t("account.emailVerificationBody")}
                </p>
              </div>
              <MailCheck
                className="mt-1 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </div>

            {profile.emailVerifiedAt ? (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge tone="success">{t("common.verified")}</Badge>
                <span>
                  {t("account.confirmedOn", { date: formatDate(profile.emailVerifiedAt) })}
                </span>
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                <Notice tone="warning">{t("account.unverifiedNotice")}</Notice>
                <form action={resendVerificationAction}>
                  <SubmitButton
                    pendingLabel={t("account.sendingEmail")}
                    variant="secondary"
                    size="sm"
                    className="w-auto"
                  >
                    {t("account.sendVerificationEmail")}
                  </SubmitButton>
                </form>
              </div>
            )}
          </section>

          {profile.role === "VENDOR" && profile.vendor ? (
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
                    {t("account.studioHeading")}
                  </h2>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {t("account.studioBody")}
                  </p>
                </div>
                <Store className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{profile.vendor.name}</p>
                  <VendorStatusBadge status={profile.vendor.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("account.appliedOn", { date: formatDate(profile.vendor.createdAt) })}
                </p>
                <Button asChild variant="secondary" size="sm" className="w-fit">
                  <Link href="/vendor">{t("account.openStudioWorkspace")}</Link>
                </Button>
              </div>
            </section>
          ) : null}

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
                  {t("account.securityHeading")}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {t("account.securityBody")}
                </p>
              </div>
              <KeyRound className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href="/forgot-password">{t("account.sendPasswordResetLink")}</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium">{t("account.sessionsHeading")}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {t("account.sessionsBody")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <form action={signOutAction}>
                  <SubmitButton
                    pendingLabel={t("account.signingOut")}
                    variant="secondary"
                    size="sm"
                    className="w-auto"
                  >
                    {t("account.signOut")}
                  </SubmitButton>
                </form>
                <form action={signOutEverywhereAction}>
                  <SubmitButton
                    pendingLabel={t("account.endingSessions")}
                    variant="ghost"
                    size="sm"
                    className="w-auto"
                  >
                    {t("account.signOutEverywhere")}
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

export const instant = false;
