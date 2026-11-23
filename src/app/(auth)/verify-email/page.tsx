import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { AuthIntro } from "@/components/auth/auth-intro";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { verifyEmailAction } from "@/features/identity/actions";
import { getServerI18n } from "@/i18n/server";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("auth.meta.verifyEmailTitle"),
    description: t("auth.meta.verifyEmailDescription"),
    robots: { index: false, follow: false },
  };
}

export default function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <VerifyEmailContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyEmailContent({
  searchParams,
}: {
  searchParams: PageProps<"/verify-email">["searchParams"];
}) {
  const params = await searchParams;
  const { t } = await getServerI18n();
  const token = typeof params.token === "string" ? params.token : "";
  const status = typeof params.status === "string" ? params.status : undefined;

  if (status === "invalid" || (status === undefined && !ACCOUNT_TOKEN_PATTERN.test(token))) {
    return (
      <>
        <AuthIntro
          eyebrow={t("auth.emailVerification")}
          title={t("auth.invalidLinkTitle")}
          description={t("auth.verifyLinkSingleUse")}
        />
        <Notice tone="danger">{t("auth.requestNewVerification")}</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/account">{t("auth.goToAccount")}</Link>
        </Button>
      </>
    );
  }

  if (status === "slow-down") {
    return (
      <>
        <AuthIntro
          eyebrow={t("auth.emailVerification")}
          title={t("auth.tooManyAttempts")}
          description={t("auth.waitAndRetry")}
        />
        <Notice tone="warning">{t("auth.rateLimited")}</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/account">{t("auth.goToAccount")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthIntro
        eyebrow={t("auth.emailVerification")}
        title={t("auth.confirmEmailTitle")}
        description={t("auth.confirmEmailBody")}
      />

      <form action={verifyEmailAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingLabel={t("auth.verifying")}>{t("auth.verifyEmail")}</SubmitButton>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        {t("auth.wrongAccount")}{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("auth.signInAgain")}
        </Link>
      </p>
    </>
  );
}

export const instant = false;
