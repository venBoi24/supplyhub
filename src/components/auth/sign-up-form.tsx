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
        label="Phone number"
        htmlFor="sign-up-phone"
        hint="Include your country code, for example +255 754 123 456. Buyers can add this later at checkout."
        error={errors?.phone}
      >
        <Input
          id="sign-up-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+255 754 123 456"
          aria-invalid={errors?.phone ? true : undefined}
          aria-describedby={errors?.phone ? "sign-up-phone-error" : undefined}
        />
      </Field>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">I want to</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-surface-muted">
          <input type="radio" name="accountType" value="BUYER" defaultChecked required />
          <span>
            <span className="block font-medium">Buy products</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              Browse the marketplace and place orders.
            </span>
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm hover:bg-surface-muted">
          <input type="radio" name="accountType" value="SELLER" required />
          <span>
            <span className="block font-medium">Sell products</span>
            <span className="block text-xs leading-5 text-muted-foreground">
              Continue to the seller application. An administrator must approve the store.
            </span>
          </span>
        </label>
        {errors?.accountType ? (
          <p className="text-xs text-danger" role="alert">
            {errors.accountType}
          </p>
        ) : null}
      </fieldset>

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
