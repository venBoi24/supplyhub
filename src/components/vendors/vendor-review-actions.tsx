"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { reviewVendorApplicationAction } from "@/features/vendors/actions";
import { useT } from "@/i18n/client";

export function VendorReviewActions({ vendorId }: { vendorId: string }) {
  const t = useT();
  const [approveState, approveAction] = useActionState(
    reviewVendorApplicationAction,
    initialFormState,
  );
  const [rejectState, rejectAction] = useActionState(
    reviewVendorApplicationAction,
    initialFormState,
  );

  const noteId = `review-note-${vendorId}`;

  return (
    <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
      <div className="space-y-3">
        <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
          {t("studio.reviewApprove")}
        </p>
        <p className="text-sm leading-5 text-muted-foreground">{t("studio.reviewApproveBody")}</p>
        <form action={approveAction} className="space-y-3">
          <input type="hidden" name="vendorId" value={vendorId} />
          <input type="hidden" name="decision" value="approve" />
          <FormMessage state={approveState} />
          <SubmitButton pendingLabel={t("studio.approvingPending")} size="sm">
            {t("studio.approveStudio")}
          </SubmitButton>
        </form>
      </div>

      <div className="space-y-3">
        <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
          {t("studio.reviewReject")}
        </p>
        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="vendorId" value={vendorId} />
          <input type="hidden" name="decision" value="reject" />
          <FormMessage state={rejectState} />
          <label htmlFor={noteId} className="sr-only">
            {t("studio.rejectionReason")}
          </label>
          <Textarea
            id={noteId}
            name="note"
            placeholder={t("studio.rejectionReasonPlaceholder")}
            aria-invalid={rejectState.fieldErrors?.note ? true : undefined}
            aria-describedby={rejectState.fieldErrors?.note ? `${noteId}-error` : undefined}
            className="min-h-24"
          />
          {rejectState.fieldErrors?.note ? (
            <p id={`${noteId}-error`} className="text-sm text-danger">
              {rejectState.fieldErrors.note}
            </p>
          ) : null}
          <SubmitButton pendingLabel={t("studio.rejectingPending")} variant="secondary" size="sm">
            {t("studio.rejectApplication")}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
