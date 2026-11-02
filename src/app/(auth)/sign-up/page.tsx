import type { Metadata } from "next";
import Link from "next/link";

import { AuthIntro } from "@/components/auth/auth-intro";
import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Create an account",
  description: "Create a SupplyHub account for orders, studios, and vendor tools.",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <>
      <AuthIntro
        eyebrow="New account"
        title="Start your registry."
        description="Create an account to shop or sell. Sellers continue to a studio application for administrator review."
      />

      <SignUpForm />

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
