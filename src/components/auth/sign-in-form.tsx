"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { PasswordInput } from "@/components/forms/password-input";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/features/identity/actions";
import { initialFormState } from "@/features/identity/form-state";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialFormState);
  const emailError = state.fieldErrors?.email;
  const passwordError = state.fieldErrors?.password;

  return (
    <form action={action} className="space-y-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <FormMessage state={state} />

      <Field label="Email" htmlFor="sign-in-email" error={emailError}>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "sign-in-email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="sign-in-password" error={passwordError}>
        <PasswordInput
          id="sign-in-password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? "sign-in-password-error" : undefined}
        />
      </Field>

      <div className="flex items-center justify-end">
        <Link
          href="/forgot-password"
          className="rounded-sm text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
