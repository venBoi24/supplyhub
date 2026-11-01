"use client";

import { useActionState } from "react";

import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/features/identity/actions";
import { initialFormState } from "@/features/identity/form-state";

export function SignUpForm() {
  const [state, action] = useActionState(signUpAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />

      <Field label="Name" htmlFor="sign-up-name" error={errors?.name}>
        <Input
          id="sign-up-name"
          name="name"
          autoComplete="name"
          required
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? "sign-up-name-error" : undefined}
        />
      </Field>

      <Field label="Email" htmlFor="sign-up-email" error={errors?.email}>
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={errors?.email ? true : undefined}
          aria-describedby={errors?.email ? "sign-up-email-error" : undefined}
        />
      </Field>

      <Field
        label="Password"
        htmlFor="sign-up-password"
        hint="At least 12 characters"
        error={errors?.password}
      >
        <PasswordInput
          id="sign-up-password"
          name="password"
          autoComplete="new-password"
          required
          aria-invalid={errors?.password ? true : undefined}
          aria-describedby={errors?.password ? "sign-up-password-error" : undefined}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="sign-up-confirm-password"
        error={errors?.confirmPassword}
      >
        <PasswordInput
          id="sign-up-confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={errors?.confirmPassword ? true : undefined}
          aria-describedby={errors?.confirmPassword ? "sign-up-confirm-password-error" : undefined}
        />
      </Field>

      <SubmitButton pendingLabel="Creating account…">Create account</SubmitButton>
    </form>
  );
}
