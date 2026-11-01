import type { Metadata } from "next";
import Link from "next/link";

import { AuthIntro } from "@/components/auth/auth-intro";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a single-use SupplyHub password reset link.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthIntro
        eyebrow="Password recovery"
        title="Reset your password."
        description="Enter the email on your account. If it matches, we will send a single-use link that expires in one hour."
      />

      <ForgotPasswordForm />

      <p className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
