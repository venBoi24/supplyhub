"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { LocationMapField } from "@/components/vendor/location-map-field";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { updateVendorProfileForUserAction } from "@/features/admin/vendor-management-actions";
import { initialFormState } from "@/features/identity/form-state";

export function AdminVendorProfileForm({
  user,
  vendor,
}: {
  user: { id: string; name: string };
  vendor: {
    id: string;
    location: string;
    discipline: string;
    story: string;
    monogram: string;
  };
}) {
  const [state, action] = useActionState(updateVendorProfileForUserAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="userId" value={user.id} />
      <input type="hidden" name="vendorId" value={vendor.id} />
      <FormMessage state={state} />
      <Field label="Username" htmlFor="managed-username">
        <Input
          id="managed-username"
          name="name"
          defaultValue={user.name}
          minLength={2}
          maxLength={80}
          required
        />
      </Field>
      <LocationMapField defaultValue={vendor.location} error={errors?.location} />
      <Field label="What they sell" htmlFor="managed-discipline" error={errors?.discipline}>
        <Input
          id="managed-discipline"
          name="discipline"
          defaultValue={vendor.discipline}
          required
          maxLength={60}
          placeholder="Ceramics, clothing, food…"
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[7rem_1fr]">
        <Field
          label="Monogram"
          htmlFor="managed-monogram"
          hint="Up to 3 letters"
          error={errors?.monogram}
        >
          <Input
            id="managed-monogram"
            name="monogram"
            defaultValue={vendor.monogram}
            maxLength={3}
          />
        </Field>
        <Field label="Store story" htmlFor="managed-story" error={errors?.story}>
          <Textarea
            id="managed-story"
            name="story"
            defaultValue={vendor.story}
            minLength={20}
            maxLength={1000}
            required
            className="min-h-32"
          />
        </Field>
      </div>
      <SubmitButton pendingLabel="Saving…" className="w-auto">
        Save profile and location
      </SubmitButton>
    </form>
  );
}
