"use client";

import Link from "next/link";
import { useActionState } from "react";

import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { resetPasswordAction } from "@/features/identity/actions";
import { initialFormState } from "@/features/identity/form-state";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action] = useActionState(resetPasswordAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage state={state} />

      <Field
        label="New password"
        htmlFor="reset-password"
        hint="At least 12 characters"
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
        label="Confirm new password"
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

      <SubmitButton pendingLabel="Updating password…">Update password</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/forgot-password"
          className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Request a new link
        </Link>
      </p>
    </form>
  );
}
