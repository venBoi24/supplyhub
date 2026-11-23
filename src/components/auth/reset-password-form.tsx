"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { resetPasswordAction } from "@/features/identity/actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useT();
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />

      <Field
        label={t("auth.newPassword")}
        htmlFor="reset-password"
        hint={t("auth.passwordHint")}
        error={errors?.password}
      >
        <PasswordInput
          id="reset-password"
          name="password"
          autoComplete="new-password"
          required
          aria-invalid={errors?.password ? true : undefined}
          aria-describedby={errors?.password ? "reset-password-error" : undefined}
        />
      </Field>

      <Field
        label={t("auth.confirmNewPassword")}
        htmlFor="reset-confirm-password"
        error={errors?.confirmPassword}
      >
        <PasswordInput
          id="reset-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={errors?.confirmPassword ? true : undefined}
          aria-describedby={errors?.confirmPassword ? "reset-confirm-password-error" : undefined}
        />
      </Field>

      <SubmitButton pendingLabel={t("auth.updatingPassword")}>
        {t("auth.updatePassword")}
      </SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          {t("auth.requestNewLink")}
        </Link>
      </p>
    </form>
  );
}
