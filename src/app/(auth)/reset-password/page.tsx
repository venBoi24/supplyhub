import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { AuthIntro } from "@/components/auth/auth-intro";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { getServerI18n } from "@/i18n/server";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("auth.meta.resetPasswordTitle"),
    description: t("auth.meta.resetPasswordDescription"),
    robots: { index: false, follow: false },
  };
}

export default function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({
  searchParams,
}: {
  searchParams: PageProps<"/reset-password">["searchParams"];
}) {
  const params = await searchParams;
  const { t } = await getServerI18n();
  const token = typeof params.token === "string" ? params.token : "";

  if (!ACCOUNT_TOKEN_PATTERN.test(token)) {
    return (
      <>
        <AuthIntro
          eyebrow={t("auth.passwordRecovery")}
          title={t("auth.invalidLinkTitle")}
          description={t("auth.resetLinkSingleUse")}
        />
        <Notice tone="danger">{t("auth.requestNewLinkNotice")}</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">{t("auth.requestNewLink")}</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthIntro
        eyebrow={t("auth.passwordRecovery")}
        title={t("auth.choosePasswordTitle")}
        description={t("auth.resetSignsOut")}
      />

      <ResetPasswordForm token={token} />
    </>
  );
}

export const instant = false;
