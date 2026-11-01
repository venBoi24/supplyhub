import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { AuthIntro } from "@/components/auth/auth-intro";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

export const metadata: Metadata = {
  title: "Choose a new password",
  description: "Complete a SupplyHub password reset.",
  robots: { index: false, follow: false },
};

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
  const token = typeof params.token === "string" ? params.token : "";

  if (!ACCOUNT_TOKEN_PATTERN.test(token)) {
    return (
      <>
        <AuthIntro
          eyebrow="Password recovery"
          title="That link cannot be used."
          description="Password reset links are single-use and expire after one hour."
        />
        <Notice tone="danger">Request a new link to continue.</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthIntro
        eyebrow="Password recovery"
        title="Choose a new password."
        description="Resetting your password signs you out on every device."
      />

      <ResetPasswordForm token={token} />
    </>
  );
}
