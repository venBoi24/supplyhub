"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import {
  deleteAdminProductAction,
  featureProductAction,
  hideAdminProductAction,
  moderateProductAction,
  restoreAdminProductAction,
} from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";
import type { ProductStatus } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";

export function AdminPostControls({
  productId,
  status,
  featured,
}: {
  productId: string;
  status: ProductStatus;
  featured: boolean;
}) {
  const t = useT();
  const [approveState, approveAction] = useActionState(moderateProductAction, initialFormState);
  const [rejectState, rejectAction] = useActionState(moderateProductAction, initialFormState);
  const [featureState, featureAction] = useActionState(featureProductAction, initialFormState);
  const [hideState, hideAction] = useActionState(hideAdminProductAction, initialFormState);
  const [restoreState, restoreAction] = useActionState(restoreAdminProductAction, initialFormState);
  const [deleteState, deleteAction] = useActionState(deleteAdminProductAction, initialFormState);

  const noteId = `reject-note-${productId}`;
  const rejectError = rejectState.fieldErrors?.note;

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      {status === "PENDING_REVIEW" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <form action={approveAction} className="space-y-3">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="decision" value="approve" />
            <FormMessage state={approveState} />
            <SubmitButton pendingLabel={t("common.saving")} size="sm" className="w-auto">
              {t("admin.publishObject")}
            </SubmitButton>
          </form>

          <form action={rejectAction} className="space-y-3">
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="decision" value="reject" />
            <FormMessage state={rejectState} />
            <Field label={t("admin.reasonForStudio")} htmlFor={noteId} error={rejectError}>
              <Textarea
                id={noteId}
                name="note"
                placeholder={t("admin.notePlaceholder")}
                aria-invalid={rejectError ? true : undefined}
                aria-describedby={rejectError ? `${noteId}-error` : undefined}
                className="min-h-20"
              />
            </Field>
            <SubmitButton
              pendingLabel={t("admin.returningPending")}
              variant="secondary"
              size="sm"
              className="w-auto"
            >
              {t("admin.returnToStudio")}
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {status === "PUBLISHED" ? (
        <div className="flex flex-wrap gap-3">
          <form action={featureAction}>
            <input type="hidden" name="productId" value={productId} />
            <input type="hidden" name="featured" value={featured ? "0" : "1"} />
            <FormMessage state={featureState} />
            <SubmitButton
              pendingLabel={t("common.saving")}
              variant="secondary"
              size="sm"
              className="w-auto"
            >
              {featured ? t("admin.removeFromFeatured") : t("admin.featureOnStorefront")}
            </SubmitButton>
          </form>
          <form action={hideAction}>
            <input type="hidden" name="productId" value={productId} />
            <FormMessage state={hideState} />
            <SubmitButton
              pendingLabel={t("common.saving")}
              variant="secondary"
              size="sm"
              className="w-auto"
            >
              {t("admin.hidePost")}
            </SubmitButton>
          </form>
        </div>
      ) : null}

      {status === "ARCHIVED" ? (
        <form action={restoreAction}>
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={restoreState} />
          <SubmitButton pendingLabel={t("common.saving")} size="sm" className="w-auto">
            {t("admin.restorePost")}
          </SubmitButton>
        </form>
      ) : null}

      {status === "DRAFT" || status === "REJECTED" || status === "ARCHIVED" ? (
        <form
          action={deleteAction}
          onSubmit={(event) => {
            if (!window.confirm(t("admin.deletePost"))) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="productId" value={productId} />
          <FormMessage state={deleteState} />
          <SubmitButton
            pendingLabel={t("common.deleting")}
            variant="secondary"
            size="sm"
            className="w-auto"
          >
            {t("admin.deletePost")}
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}
