import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthIntro } from "@/components/auth/auth-intro";
import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Notice } from "@/components/ui/notice";
import { getServerI18n } from "@/i18n/server";
import { safeNextPath } from "@/lib/security/safe-redirect";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("auth.signInTitle"),
    description: t("auth.meta.signInDescription"),
    robots: { index: false, follow: false },
  };
}

function queryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <Suspense fallback={<AuthFormSkeleton />}>
      <SignInContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignInContent({
  searchParams,
}: {
  searchParams: PageProps<"/sign-in">["searchParams"];
}) {
  const params = await searchParams;
  const { t } = await getServerI18n();
  const nextValue = queryValue(params.next);
  const next = nextValue ? safeNextPath(nextValue, "/account") : undefined;

  const notice =
    queryValue(params.reset) === "1"
      ? t("auth.noticeReset")
      : queryValue(params.verified) === "1"
        ? t("auth.noticeVerified")
        : queryValue(params.signout) === "all"
          ? t("auth.noticeSignoutAll")
          : null;

  return (
    <>
      <AuthIntro
        eyebrow={t("auth.accountEyebrow")}
        title={t("auth.signInIntroTitle")}
        description={t("auth.signInIntroBody")}
      />

      {notice ? (
        <Notice tone="success" className="mb-6">
          {notice}
        </Notice>
      ) : null}

      <SignInForm next={next} />

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>{t("auth.rejectedNote")}</p>
        <p>{t("auth.unverifiedNote")}</p>
      </div>

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        {t("auth.newToSupplyHub")}{" "}
        <Link
          href="/sign-up"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("auth.createAnAccount")}
        </Link>
      </p>
    </>
  );
}

export const instant = false;
