"use client";

import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import {
  deleteProductImageAction,
  moveProductImageAction,
  uploadProductImageAction,
} from "@/features/catalog/vendor-actions";
import { initialFormState, type FormState } from "@/features/identity/form-state";

export interface StudioImage {
  id: string;
  src: string;
  alt: string;
  sortOrder: number;
}

export function ProductImagesPanel({
  productId,
  images,
  canEdit,
  limitReached,
}: {
  productId: string;
  images: StudioImage[];
  canEdit: boolean;
  limitReached: boolean;
}) {
  const [state, action] = useActionState(uploadProductImageAction, initialFormState);
  const errors = state.fieldErrors;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Images</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          JPEG, PNG, or WebP up to 5 MB. The first image is the cover. Up to six images per object.
        </p>
      </div>

      {images.length > 0 ? (
        <ul className="space-y-3">
          {images.map((image, index) => (
            <li key={image.id}>
              <ImageRow
                image={image}
                canEdit={canEdit}
                isFirst={index === 0}
                isLast={index === images.length - 1}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
          No images yet. At least one image is needed before this object can be submitted.
        </p>
      )}

      {canEdit && !limitReached ? (
        <form action={action} className="space-y-4 border-t border-border pt-5">
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={state} />

          <Field
            label="Describe the image"
            htmlFor="image-alt"
            hint="Read by screen readers"
            error={errors?.alt}
          >
            <Input
              id="image-alt"
              name="alt"
              required
              maxLength={160}
              placeholder="A speckled carafe against a limestone wall."
              aria-invalid={errors?.alt ? true : undefined}
              aria-describedby={errors?.alt ? "image-alt-error" : undefined}
            />
          </Field>

          <Field label="Image file" htmlFor="image-file" error={errors?.image}>
            <Input
              id="image-file"
              name="image"
              type="file"
              required
              accept="image/jpeg,image/png,image/webp"
              className="h-auto py-2.5 file:mr-3 file:rounded-sm file:border-0 file:bg-surface-muted file:px-2.5 file:py-1.5 file:text-xs file:font-medium file:text-foreground"
              aria-invalid={errors?.image ? true : undefined}
              aria-describedby={errors?.image ? "image-file-error" : undefined}
            />
          </Field>

          <SubmitButton pendingLabel="Uploading…" variant="secondary" className="w-auto" size="sm">
            Add image
          </SubmitButton>
        </form>
      ) : null}

      {limitReached ? (
        <p className="text-xs text-muted-foreground">
          The image limit is reached. Remove an image to add another.
        </p>
      ) : null}
    </div>
  );
}

function ImageRow({
  image,
  canEdit,
  isFirst,
  isLast,
}: {
  image: StudioImage;
  canEdit: boolean;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [deleteState, deleteAction] = useActionState(deleteProductImageAction, initialFormState);
  const [moveState, moveAction] = useActionState(moveProductImageAction, initialFormState);

  return (
    <div className="flex items-start gap-4 rounded-lg border border-border bg-surface p-3">
      <Image
        src={image.src}
        alt={image.alt}
        width={72}
        height={90}
        className="h-24 w-[4.5rem] rounded-sm object-cover"
      />

      <div className="min-w-0 flex-1">
        <p className="text-sm leading-5">{image.alt}</p>
        <p className="mt-1 font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
          Position {image.sortOrder + 1}
        </p>

        <RowError state={deleteState} />
        <RowError state={moveState} />

        {canEdit ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <form action={moveAction}>
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="direction" value="up" />
              <button
                type="submit"
                disabled={isFirst}
                className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                aria-label="Move image earlier"
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </button>
            </form>
            <form action={moveAction}>
              <input type="hidden" name="imageId" value={image.id} />
              <input type="hidden" name="direction" value="down" />
              <button
                type="submit"
                disabled={isLast}
                className="inline-flex size-8 items-center justify-center rounded-sm border border-border text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
                aria-label="Move image later"
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </button>
            </form>
            <form action={deleteAction}>
              <input type="hidden" name="imageId" value={image.id} />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {isFirst ? (
        <span className="inline-flex items-center gap-1 font-mono text-[0.625rem] tracking-[0.14em] text-clay uppercase">
          <ImagePlus className="size-3" aria-hidden="true" />
          Cover
        </span>
      ) : null}
    </div>
  );
}

function RowError({ state }: { state: FormState }) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <p role="alert" className="mt-2 text-xs text-danger">
      {state.message}
    </p>
  );
}
