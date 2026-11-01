"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import {
  archiveProductAction,
  deleteProductAction,
  submitProductAction,
} from "@/features/catalog/vendor-actions";
import { initialFormState } from "@/features/identity/form-state";
import type { ProductStatus } from "@/generated/prisma/enums";

export function ProductLifecycleActions({
  productId,
  status,
  publicHref,
  imageCount,
}: {
  productId: string;
  status: ProductStatus;
  publicHref: string;
  imageCount: number;
}) {
  const [submitState, submitAction] = useActionState(submitProductAction, initialFormState);
  const [archiveState, archiveAction] = useActionState(archiveProductAction, initialFormState);
  const [deleteState, deleteAction] = useActionState(deleteProductAction, initialFormState);

  const canSubmit = status === "DRAFT" || status === "REJECTED";
  const canArchive = status !== "ARCHIVED";
  const canDelete = status === "DRAFT" || status === "REJECTED";

  if (!canSubmit && !canArchive && !canDelete) {
    return null;
  }

  return (
    <div className="space-y-4">
      {canSubmit ? (
        <form action={submitAction} className="space-y-2">
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={submitState} />
          <SubmitButton pendingLabel="Submitting…" disabled={imageCount === 0}>
            Submit for review
          </SubmitButton>
          {imageCount === 0 ? (
            <p className="text-xs text-muted-foreground">Add an image before submitting.</p>
          ) : null}
        </form>
      ) : null}

      {status === "PUBLISHED" ? (
        <Link
          href={publicHref}
          className="inline-flex text-sm font-medium text-accent underline-offset-4 hover:underline"
        >
          View on the storefront
        </Link>
      ) : null}

      {canArchive ? (
        <form action={archiveAction} className="space-y-2">
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={archiveState} />
          <SubmitButton
            pendingLabel="Archiving…"
            variant="secondary"
            className="w-full justify-start"
          >
            Archive object
          </SubmitButton>
        </form>
      ) : null}

      {canDelete ? (
        <form
          action={deleteAction}
          className="space-y-2"
          onSubmit={(event) => {
            if (!window.confirm("Delete this draft permanently? Images will be removed too.")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={deleteState} />
          <SubmitButton
            pendingLabel="Deleting…"
            variant="ghost"
            className="w-full justify-start text-danger hover:bg-danger/10"
          >
            Delete draft
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
