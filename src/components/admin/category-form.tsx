"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { saveCategoryAction } from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

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
  const t = useT();
  const [state, action] = useActionState(saveCategoryAction, initialFormState);
  const errors = state.fieldErrors;
  const editing = Boolean(category?.id);
  const prefix = editing ? "edit" : "new";

  return (
    <form action={action} className="space-y-5">
      {category?.id ? <input type="hidden" name="categoryId" value={category.id} /> : null}
      <FormMessage state={state} />

      <Field label={t("auth.name")} htmlFor={`${prefix}-category-name`} error={errors?.name}>
        <Input
          id={`${prefix}-category-name`}
          name="name"
          defaultValue={category?.name}
          required
          maxLength={60}
          placeholder={t("admin.categoryNamePlaceholder")}
          aria-invalid={errors?.name ? true : undefined}
          aria-describedby={errors?.name ? `${prefix}-category-name-error` : undefined}
        />
      </Field>

      <Field
        label={t("studio.handle")}
        htmlFor={`${prefix}-category-slug`}
        hint={t("admin.publicWebAddress")}
        error={errors?.slug}
      >
        <Input
          id={`${prefix}-category-slug`}
          name="slug"
          defaultValue={category?.slug}
          required
          spellCheck={false}
          placeholder={t("admin.categoryHandlePlaceholder")}
          aria-invalid={errors?.slug ? true : undefined}
          aria-describedby={errors?.slug ? `${prefix}-category-slug-error` : undefined}
        />
      </Field>

      <Field
        label={t("admin.fieldHeadline")}
        htmlFor={`${prefix}-category-headline`}
        hint={t("common.optional")}
        error={errors?.headline}
      >
        <Input
          id={`${prefix}-category-headline`}
          name="headline"
          defaultValue={category?.headline}
          maxLength={120}
          placeholder={t("admin.categoryHeadlinePlaceholder")}
          aria-invalid={errors?.headline ? true : undefined}
          aria-describedby={errors?.headline ? `${prefix}-category-headline-error` : undefined}
        />
      </Field>

      <Field
        label={t("product.description")}
        htmlFor={`${prefix}-category-description`}
        hint={t("common.optional")}
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

      <SubmitButton pendingLabel={t("common.saving")} className="w-auto">
        {editing ? t("admin.saveDepartment") : t("admin.createDepartment")}
      </SubmitButton>
    </form>
  );
}
