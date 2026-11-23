"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { featureProductAction, moderateProductAction } from "@/features/catalog/admin-actions";
import { initialFormState } from "@/features/identity/form-state";
import type { ProductStatus } from "@/generated/prisma/enums";
import { useT } from "@/i18n/client";

export function ProductControls({
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

  if (status !== "PENDING_REVIEW" && status !== "PUBLISHED") {
    return null;
  }

  const noteId = `reject-note-${productId}`;
  const rejectError = rejectState.fieldErrors?.note;

  return (
    <div className="mt-5 space-y-4 border-t border-border pt-5">
      {status === "PENDING_REVIEW" ? (
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
              {t("admin.approveHeading")}
            </p>
            <form action={approveAction} className="space-y-3">
              <input type="hidden" name="productId" value={productId} />
              <input type="hidden" name="decision" value="approve" />
              <FormMessage state={approveState} />
              <SubmitButton
                pendingLabel={t("admin.publishingPending")}
                size="sm"
                className="w-auto"
              >
                {t("admin.publishObject")}
              </SubmitButton>
            </form>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
              {t("admin.requestChangesHeading")}
            </p>
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
        </div>
      ) : null}

      {status === "PUBLISHED" ? (
        <form action={featureAction} className="space-y-3">
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
      ) : null}
    </div>
  );
}
