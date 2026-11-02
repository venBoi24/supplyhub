"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LocationMapField } from "@/components/vendor/location-map-field";
import {
  VendorDepartmentPicker,
  type VendorDepartmentOption,
} from "@/components/vendors/vendor-department-picker";
import { updateStudioProfileAction } from "@/features/catalog/vendor-actions";
import { initialFormState } from "@/features/identity/form-state";

export function StudioProfileForm({
  defaults,
  departments,
}: {
  departments: VendorDepartmentOption[];
  defaults: {
    location: string;
    city: string;
    street: string;
    address: string;
    latitude: string;
    longitude: string;
    discipline: string;
    contactPhone: string;
    departmentIds: string[];
    story: string;
    monogram: string;
  };
}) {
  const [state, action] = useActionState(updateStudioProfileAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <FormMessage state={state} />

      <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
        <Field
          label="Monogram"
          htmlFor="studio-monogram"
          hint="Up to 3 letters"
          error={errors?.monogram}
        >
          <Input
            id="studio-monogram"
            name="monogram"
            defaultValue={defaults.monogram}
            maxLength={3}
            placeholder="AN"
            className="uppercase"
            aria-invalid={errors?.monogram ? true : undefined}
            aria-describedby={errors?.monogram ? "studio-monogram-error" : undefined}
          />
        </Field>
      </div>

      <LocationMapField
        defaultValue={defaults.location}
        defaultCity={defaults.city}
        defaultStreet={defaults.street}
        defaultAddress={defaults.address}
        defaultLatitude={defaults.latitude}
        defaultLongitude={defaults.longitude}
        errors={errors}
      />

      <VendorDepartmentPicker
        departments={departments}
        selectedIds={defaults.departmentIds}
        error={errors?.departmentIds}
      />

      <Field
        label="Public contact phone"
        htmlFor="studio-contact-phone"
        hint="Customers will use this to contact your studio. Include your country code."
        error={errors?.contactPhone}
      >
        <Input
          id="studio-contact-phone"
          name="contactPhone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          defaultValue={defaults.contactPhone}
          required
          placeholder="+255 754 123 456"
          aria-invalid={errors?.contactPhone ? true : undefined}
          aria-describedby={errors?.contactPhone ? "studio-contact-phone-error" : undefined}
        />
      </Field>

      <Field label="Discipline" htmlFor="studio-discipline" error={errors?.discipline}>
        <Input
          id="studio-discipline"
          name="discipline"
          defaultValue={defaults.discipline}
          required
          maxLength={60}
          placeholder="Ceramics"
          aria-invalid={errors?.discipline ? true : undefined}
          aria-describedby={errors?.discipline ? "studio-discipline-error" : undefined}
        />
      </Field>

      <Field
        label="Studio story"
        htmlFor="studio-story"
        hint="20–1000 characters"
        error={errors?.story}
      >
        <Textarea
          id="studio-story"
          name="story"
          defaultValue={defaults.story}
          required
          maxLength={1000}
          className="min-h-40"
          aria-invalid={errors?.story ? true : undefined}
          aria-describedby={errors?.story ? "studio-story-error" : undefined}
        />
      </Field>

      <SubmitButton pendingLabel="Saving…" className="w-auto">
        Save studio profile
      </SubmitButton>
    </form>
  );
}
