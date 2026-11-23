"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { forgotPasswordAction } from "@/features/identity/actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

export function ForgotPasswordForm() {
  const t = useT();
  const [state, action] = useActionState(forgotPasswordAction, initialFormState);
  const emailError = state.fieldErrors?.email;

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <FormMessage state={state} />
        <p className="text-sm leading-6 text-muted-foreground">{t("auth.linkExpires")}</p>
        <Link
          href="/sign-in"
          className="inline-flex rounded-sm text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />

      <Field label={t("auth.email")} htmlFor="forgot-email" error={emailError}>
        <Input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "forgot-email-error" : undefined}
        />
      </Field>

      <SubmitButton pendingLabel={t("auth.sendingLink")}>{t("auth.sendResetLink")}</SubmitButton>
    </form>
  );
}
