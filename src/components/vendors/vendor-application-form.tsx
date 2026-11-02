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

export function VendorApplicationForm({ departments }: { departments: VendorDepartmentOption[] }) {
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
