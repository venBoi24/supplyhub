import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthIntro } from "@/components/auth/auth-intro";
import { AuthFormSkeleton } from "@/components/auth/auth-skeleton";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Notice } from "@/components/ui/notice";
import { safeNextPath } from "@/lib/security/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your SupplyHub account.",
  robots: { index: false, follow: false },
};

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
  const nextValue = queryValue(params.next);
  const next = nextValue ? safeNextPath(nextValue, "/account") : undefined;

  const notice =
    queryValue(params.reset) === "1"
      ? "Password updated. Sign in with your new password."
      : queryValue(params.verified) === "1"
        ? "Email verified. Sign in to continue."
        : queryValue(params.signout) === "all"
          ? "You have been signed out on every device."
          : null;

  return (
    <>
      <AuthIntro
        eyebrow="Account"
        title="Sign in to your registry."
        description="Your orders, saved studios, and vendor workspace live behind one account."
      />

      {notice ? (
        <Notice tone="success" className="mb-6">
          {notice}
        </Notice>
      ) : null}

      <SignInForm next={next} />

      <div className="mt-6 space-y-2 text-sm text-muted-foreground">
        <p>Studio application rejected? Sign in to review the decision and submit an appeal.</p>
        <p>
          Email not verified? Sign in, then request a new verification link from your account page.
        </p>
      </div>

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        New to SupplyHub?{" "}
        <Link
          href="/sign-up"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Create an account
        </Link>
      </p>
    </>
  );
}
