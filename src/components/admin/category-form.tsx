"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { saveCategoryAction } from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";

export function CategoryForm({
  category,
}: {
  category?: {
    id: string;
    name: string;
    slug: string;
    headline: string;
    description: string;
  };
}) {
  const [state, action] = useActionState(saveCategoryAction, initialFormState);
  const errors = state.fieldErrors;
  const editing = Boolean(category?.id);
  const prefix = editing ? "edit" : "new";

  return (
    <form action={action} className="space-y-5">
      {category?.id ? <input type="hidden" name="categoryId" value={category.id} /> : null}
      <FormMessage state={state} />

      <Field label="Name" htmlFor={`${prefix}-category-name`} error={errors?.name}>
        <Input
          id={`${prefix}-category-name`}
          name="name"
          defaultValue={category?.name}
          required
          maxLength={60}
          placeholder="Ceramics"
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? `${prefix}-category-name-error` : undefined}
        />
      </Field>

      <Field
        label="Handle"
        htmlFor={`${prefix}-category-slug`}
        hint="Public web address"
        error={errors?.slug}
      >
        <Input
          id={`${prefix}-category-slug`}
          name="slug"
          defaultValue={category?.slug}
          required
          spellCheck={false}
          placeholder="ceramics"
          aria-invalid={errors?.slug ? true : undefined}
          aria-describedby={errors?.slug ? `${prefix}-category-slug-error` : undefined}
        />
      </Field>

      <Field
        label="Headline"
        htmlFor={`${prefix}-category-headline`}
        hint="Optional"
        error={errors?.headline}
      >
        <Input
          id={`${prefix}-category-headline`}
          name="headline"
          defaultValue={category?.headline}
          maxLength={120}
          placeholder="Vessels for the daily ritual"
          aria-invalid={errors?.headline ? true : undefined}
          aria-describedby={errors?.headline ? `${prefix}-category-headline-error` : undefined}
        />
      </Field>

      <Field
        label="Description"
        htmlFor={`${prefix}-category-description`}
        hint="Optional"
        error={errors?.description}
      >
        <Textarea
          id={`${prefix}-category-description`}
          name="description"
          defaultValue={category?.description}
          maxLength={600}
          className="min-h-32"
          aria-invalid={errors?.description ? true : undefined}
          aria-describedby={
            errors?.description ? `${prefix}-category-description-error` : undefined
          }
        />
      </Field>

      <SubmitButton pendingLabel="Saving…" className="w-auto">
        {editing ? "Save department" : "Create department"}
      </SubmitButton>
    </form>
  );
}
