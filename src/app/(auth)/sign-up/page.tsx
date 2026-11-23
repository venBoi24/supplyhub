import type { Metadata } from "next";
import Link from "next/link";

import { AuthIntro } from "@/components/auth/auth-intro";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getServerI18n } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();

  return {
    title: t("auth.createAnAccount"),
    description: t("auth.meta.signUpDescription"),
    robots: { index: false, follow: false },
  };
}

export default async function SignUpPage() {
  const { t } = await getServerI18n();

  return (
    <>
      <AuthIntro
        eyebrow={t("auth.newAccount")}
        title={t("auth.signUpIntroTitle")}
        description={t("auth.signUpIntroBody")}
      />

      <SignUpForm />

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        {t("auth.haveAccount")}{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("auth.signInTitle")}
        </Link>
      </p>
    </>
  );
}

export const instant = false;
