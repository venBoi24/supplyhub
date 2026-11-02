"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import {
  VendorDepartmentPicker,
  type VendorDepartmentOption,
} from "@/components/vendors/vendor-department-picker";
import { initialFormState } from "@/features/identity/form-state";
import { applyForVendorAction } from "@/features/vendors/actions";

export function VendorApplicationForm({
  departments,
  defaultPhone,
}: {
  departments: VendorDepartmentOption[];
  defaultPhone: string;
}) {
  const [state, action] = useActionState(applyForVendorAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />

      <Field label="Studio name" htmlFor="vendor-name" error={errors?.name}>
        <Input
          id="vendor-name"
          name="name"
          autoComplete="organization"
          required
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? "vendor-name-error" : undefined}
        />
      </Field>

      <Field
        label="Studio handle"
        htmlFor="vendor-slug"
        hint="Lowercase, hyphens"
        error={errors?.slug}
      >
        <Input
          id="vendor-slug"
          name="slug"
          autoComplete="off"
          spellCheck={false}
          required
          placeholder="harbor-and-loom"
          aria-invalid={errors?.slug ? true : undefined}
          aria-describedby={errors?.slug ? "vendor-slug-error" : undefined}
        />
      </Field>

      <Field
        label="Public contact phone"
        htmlFor="vendor-contact-phone"
        hint="Customers will use this to contact your studio. Include your country code."
        error={errors?.contactPhone}
      >
        <Input
          id="vendor-contact-phone"
          name="contactPhone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          defaultValue={defaultPhone}
          required
          placeholder="+255 754 123 456"
          aria-invalid={errors?.contactPhone ? true : undefined}
          aria-describedby={errors?.contactPhone ? "vendor-contact-phone-error" : undefined}
        />
      </Field>

      <VendorDepartmentPicker departments={departments} error={errors?.departmentIds} />

      <Field
        label="What do you make?"
        htmlFor="vendor-description"
        hint="20–1000 characters"
        error={errors?.description}
      >
        <Textarea
          id="vendor-description"
          name="description"
          required
          aria-invalid={errors?.description ? true : undefined}
          aria-describedby={errors?.description ? "vendor-description-error" : undefined}
        />
      </Field>

      <SubmitButton pendingLabel="Submitting application…">Submit application</SubmitButton>

      <p className="text-xs leading-5 text-muted-foreground">
        Applications are reviewed by a SupplyHub administrator. You cannot edit your application
        while it is pending.
      </p>
    </form>
  );
}
