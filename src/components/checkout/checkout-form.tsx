"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { placeOrderAction } from "@/features/checkout/actions";
import { initialFormState } from "@/features/identity/form-state";

export interface CheckoutFormProps {
  defaultName: string;
  defaultEmail: string;
  reservationMinutes: number;
}

export function CheckoutForm({ defaultName, defaultEmail, reservationMinutes }: CheckoutFormProps) {
  const [state, formAction] = useActionState(placeOrderAction, initialFormState);
  const errors = state.fieldErrors ?? {};

  function inputProps(field: string) {
    return {
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": errors[field] ? `${field}-error` : undefined,
    } as const;
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name" htmlFor="recipientName" error={errors.recipientName}>
          <Input
            id="recipientName"
            name="recipientName"
            autoComplete="name"
            defaultValue={defaultName}
            required
            {...inputProps("recipientName")}
          />
        </Field>
        <Field label="Email" htmlFor="contactEmail" error={errors.contactEmail}>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            autoComplete="email"
            defaultValue={defaultEmail}
            required
            {...inputProps("contactEmail")}
          />
        </Field>
        <Field
          label="Phone"
          htmlFor="contactPhone"
          hint="Optional"
          error={errors.contactPhone}
          className="sm:col-span-2"
        >
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            autoComplete="tel"
            {...inputProps("contactPhone")}
          />
        </Field>
        <Field
          label="Street address"
          htmlFor="addressLine1"
          error={errors.addressLine1}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine1"
            name="addressLine1"
            autoComplete="address-line1"
            required
            {...inputProps("addressLine1")}
          />
        </Field>
        <Field
          label="Apartment, suite, or unit"
          htmlFor="addressLine2"
          hint="Optional"
          error={errors.addressLine2}
          className="sm:col-span-2"
        >
          <Input
            id="addressLine2"
            name="addressLine2"
            autoComplete="address-line2"
            {...inputProps("addressLine2")}
          />
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            required
            {...inputProps("city")}
          />
        </Field>
        <Field label="State, region, or province" htmlFor="region" error={errors.region}>
          <Input
            id="region"
            name="region"
            autoComplete="address-level1"
            required
            {...inputProps("region")}
          />
        </Field>
        <Field label="Postal code" htmlFor="postalCode" error={errors.postalCode}>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            required
            {...inputProps("postalCode")}
          />
        </Field>
        <Field
          label="Country code"
          htmlFor="countryCode"
          hint="Two letters, e.g. US"
          error={errors.countryCode}
        >
          <Input
            id="countryCode"
            name="countryCode"
            autoComplete="country"
            maxLength={2}
            required
            {...inputProps("countryCode")}
          />
        </Field>
      </div>

      <FormMessage state={state} />

      <div className="border-t border-border pt-6">
        <SubmitButton pendingLabel="Reserving your order…" size="lg">
          Place order
        </SubmitButton>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Payment is collected through LynxPay on the order page in Tanzanian shillings. The order
          holds its stock reservation for {reservationMinutes} minutes while you pay. Shipping and
          tax are not calculated.
        </p>
      </div>
    </form>
  );
}
