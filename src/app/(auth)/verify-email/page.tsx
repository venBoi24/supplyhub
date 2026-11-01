import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { AuthIntro } from "@/components/auth/auth-intro";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { verifyEmailAction } from "@/features/identity/actions";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm the email address on your SupplyHub account.",
  robots: { index: false, follow: false },
};

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
  const token = typeof params.token === "string" ? params.token : "";
  const status = typeof params.status === "string" ? params.status : undefined;

  if (status === "invalid" || (status === undefined && !ACCOUNT_TOKEN_PATTERN.test(token))) {
    return (
      <>
        <AuthIntro
          eyebrow="Email verification"
          title="That link cannot be used."
          description="Verification links are single-use and expire after 24 hours."
        />
        <Notice tone="danger">Request a new verification email from your account page.</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/account">Go to account</Link>
        </Button>
      </>
    );
  }

  if (status === "slow-down") {
    return (
      <>
        <AuthIntro
          eyebrow="Email verification"
          title="Too many attempts."
          description="Wait a short while, then try the link again."
        />
        <Notice tone="warning">Verification attempts are rate limited to protect accounts.</Notice>
        <Button asChild className="mt-6 w-full">
          <Link href="/account">Go to account</Link>
        </Button>
      </>
    );
  }

  return (
    <>
      <AuthIntro
        eyebrow="Email verification"
        title="Confirm your email."
        description="This confirms the address on your SupplyHub account. The link can only be used once."
      />

      <form action={verifyEmailAction} className="space-y-5">
        <input type="hidden" name="token" value={token} />
        <SubmitButton pendingLabel="Verifying…">Verify email</SubmitButton>
      </form>

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        Wrong account?{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Sign in again
        </Link>
      </p>
    </>
  );
}
