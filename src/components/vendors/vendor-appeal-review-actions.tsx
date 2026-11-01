"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { reviewVendorAppealAction } from "@/features/vendors/actions";

export function VendorAppealReviewActions({ vendorId }: { vendorId: string }) {
  const [approveState, approveAction] = useActionState(reviewVendorAppealAction, initialFormState);
  const [rejectState, rejectAction] = useActionState(reviewVendorAppealAction, initialFormState);

  return (
    <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
      <form action={approveAction} className="space-y-3">
        <input type="hidden" name="vendorId" value={vendorId} />
        <input type="hidden" name="decision" value="approve" />
        <FormMessage state={approveState} />
        <SubmitButton size="sm" pendingLabel="Approving…">
          Approve appeal
        </SubmitButton>
      </form>
      <form action={rejectAction} className="space-y-3">
        <input type="hidden" name="vendorId" value={vendorId} />
        <input type="hidden" name="decision" value="reject" />
        <label htmlFor={`appeal-note-${vendorId}`} className="sr-only">
          Reason for declining appeal
        </label>
        <Textarea
          id={`appeal-note-${vendorId}`}
          name="note"
          minLength={3}
          maxLength={500}
          required
          className="min-h-20"
          placeholder="Reason for declining this appeal"
          aria-invalid={rejectState.fieldErrors?.note ? true : undefined}
        />
        {rejectState.fieldErrors?.note ? (
          <p className="text-sm text-danger">{rejectState.fieldErrors.note}</p>
        ) : null}
        <FormMessage state={rejectState} />
        <SubmitButton size="sm" variant="secondary" pendingLabel="Declining…">
          Decline appeal
        </SubmitButton>
      </form>
    </div>
  );
}
