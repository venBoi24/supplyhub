"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { saveProductAction } from "@/features/catalog/vendor-actions";
import { initialFormState } from "@/features/identity/form-state";

export interface StudioProductFormValues {
  id?: string;
  name?: string;
  slug?: string;
  categoryId?: string;
  sku?: string;
  price?: string;
  compareAtPrice?: string;
  summary?: string;
  description?: string;
  makerNote?: string;
  materials?: string[];
  dimensions?: string;
  care?: string;
  initialStock?: number;
}

export function StudioProductForm({
  categories,
  product,
}: {
  categories: Array<{ id: string; name: string }>;
  product?: StudioProductFormValues;
}) {
  const [state, action] = useActionState(saveProductAction, initialFormState);
  const errors = state.fieldErrors;
  const editing = Boolean(product?.id);
  const prefix = editing ? "edit" : "new";

  return (
    <form action={action} className="space-y-8">
      {product?.id ? <input type="hidden" name="productId" value={product.id} /> : null}

      <FormMessage state={state} />

      <fieldset className="space-y-5">
        <legend className="eyebrow text-muted-foreground">The object</legend>

        <Field label="Name" htmlFor={`${prefix}-name`} error={errors?.name}>
          <Input
            id={`${prefix}-name`}
            name="name"
            defaultValue={product?.name}
            required
            maxLength={120}
            aria-invalid={errors?.name ? true : undefined}
            aria-describedby={errors?.name ? `${prefix}-name-error` : undefined}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Handle"
            htmlFor={`${prefix}-slug`}
            hint="Public web address"
            error={errors?.slug}
          >
            <Input
              id={`${prefix}-slug`}
              name="slug"
              defaultValue={product?.slug}
              required
              spellCheck={false}
              placeholder="ridge-carafe"
              aria-invalid={errors?.slug ? true : undefined}
              aria-describedby={errors?.slug ? `${prefix}-slug-error` : undefined}
            />
          </Field>

          <Field label="Department" htmlFor={`${prefix}-category`} error={errors?.categoryId}>
            <Select
              id={`${prefix}-category`}
              name="categoryId"
              defaultValue={product?.categoryId ?? ""}
              required
              aria-invalid={errors?.categoryId ? true : undefined}
              aria-describedby={errors?.categoryId ? `${prefix}-category-error` : undefined}
            >
              <option value="" disabled>
                Choose a department
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <Field label="SKU" htmlFor={`${prefix}-sku`} error={errors?.sku}>
            <Input
              id={`${prefix}-sku`}
              name="sku"
              defaultValue={product?.sku}
              required
              spellCheck={false}
              placeholder="SH-CARAFE-01"
              aria-invalid={errors?.sku ? true : undefined}
              aria-describedby={errors?.sku ? `${prefix}-sku-error` : undefined}
            />
          </Field>

          <Field label="Price" htmlFor={`${prefix}-price`} hint="TZS" error={errors?.priceCents}>
            <Input
              id={`${prefix}-price`}
              name="price"
              defaultValue={product?.price}
              required
              inputMode="decimal"
              placeholder="68.00"
              aria-invalid={errors?.priceCents ? true : undefined}
              aria-describedby={errors?.priceCents ? `${prefix}-price-error` : undefined}
            />
          </Field>

          <Field
            label="Compare at"
            htmlFor={`${prefix}-compare`}
            hint="Optional"
            error={errors?.compareAtPriceCents}
          >
            <Input
              id={`${prefix}-compare`}
              name="compareAtPrice"
              defaultValue={product?.compareAtPrice}
              inputMode="decimal"
              placeholder="84.00"
              aria-invalid={errors?.compareAtPriceCents ? true : undefined}
              aria-describedby={errors?.compareAtPriceCents ? `${prefix}-compare-error` : undefined}
            />
          </Field>
        </div>

        {!editing ? (
          <Field
            label="Opening stock"
            htmlFor="new-initial-stock"
            hint="Units on hand"
            error={errors?.initialStock}
          >
            <Input
              id="new-initial-stock"
              name="initialStock"
              type="number"
              min={0}
              max={100000}
              step={1}
              defaultValue={product?.initialStock ?? 0}
              aria-invalid={errors?.initialStock ? true : undefined}
              aria-describedby={errors?.initialStock ? "new-initial-stock-error" : undefined}
            />
          </Field>
        ) : null}
      </fieldset>

      <fieldset className="space-y-5 border-t border-border pt-8">
        <legend className="eyebrow text-muted-foreground">The story</legend>

        <Field
          label="Summary"
          htmlFor={`${prefix}-summary`}
          hint="10–280 characters"
          error={errors?.summary}
        >
          <Textarea
            id={`${prefix}-summary`}
            name="summary"
            defaultValue={product?.summary}
            required
            maxLength={280}
            className="min-h-20"
            aria-invalid={errors?.summary ? true : undefined}
            aria-describedby={errors?.summary ? `${prefix}-summary-error` : undefined}
          />
        </Field>

        <Field
          label="Description"
          htmlFor={`${prefix}-description`}
          hint="20–4000 characters"
          error={errors?.description}
        >
          <Textarea
            id={`${prefix}-description`}
            name="description"
            defaultValue={product?.description}
            required
            maxLength={4000}
            className="min-h-40"
            aria-invalid={errors?.description ? true : undefined}
            aria-describedby={errors?.description ? `${prefix}-description-error` : undefined}
          />
        </Field>

        <Field
          label="Maker note"
          htmlFor={`${prefix}-maker-note`}
          hint="Optional"
          error={errors?.makerNote}
        >
          <Textarea
            id={`${prefix}-maker-note`}
            name="makerNote"
            defaultValue={product?.makerNote}
            maxLength={600}
            aria-invalid={errors?.makerNote ? true : undefined}
            aria-describedby={errors?.makerNote ? `${prefix}-maker-note-error` : undefined}
          />
        </Field>
      </fieldset>

      <fieldset className="space-y-5 border-t border-border pt-8">
        <legend className="eyebrow text-muted-foreground">Details</legend>

        <Field
          label="Materials"
          htmlFor={`${prefix}-materials`}
          hint="One per line"
          error={errors?.materials}
        >
          <Textarea
            id={`${prefix}-materials`}
            name="materials"
            defaultValue={product?.materials?.join("\n")}
            className="min-h-24"
            aria-invalid={errors?.materials ? true : undefined}
            aria-describedby={errors?.materials ? `${prefix}-materials-error` : undefined}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Dimensions" htmlFor={`${prefix}-dimensions`} error={errors?.dimensions}>
            <Input
              id={`${prefix}-dimensions`}
              name="dimensions"
              defaultValue={product?.dimensions}
              maxLength={160}
              aria-invalid={errors?.dimensions ? true : undefined}
              aria-describedby={errors?.dimensions ? `${prefix}-dimensions-error` : undefined}
            />
          </Field>

          <Field label="Care" htmlFor={`${prefix}-care`} error={errors?.care}>
            <Input
              id={`${prefix}-care`}
              name="care"
              defaultValue={product?.care}
              maxLength={400}
              aria-invalid={errors?.care ? true : undefined}
              aria-describedby={errors?.care ? `${prefix}-care-error` : undefined}
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <SubmitButton pendingLabel={editing ? "Saving…" : "Creating…"} className="w-auto">
          {editing ? "Save changes" : "Create draft"}
        </SubmitButton>
        <p className="text-xs leading-5 text-muted-foreground">
          New objects start as drafts. Add at least one image before submitting for review.
        </p>
      </div>
    </form>
  );
}
