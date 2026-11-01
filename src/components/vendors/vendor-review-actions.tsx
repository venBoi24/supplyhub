"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { reviewVendorApplicationAction } from "@/features/vendors/actions";

export function VendorReviewActions({ vendorId }: { vendorId: string }) {
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
          Approve
        </p>
        <p className="text-sm leading-5 text-muted-foreground">
          Grants the owner a vendor role and studio workspace.
        </p>
        <form action={approveAction} className="space-y-3">
          <input type="hidden" name="vendorId" value={vendorId} />
          <input type="hidden" name="decision" value="approve" />
          <FormMessage state={approveState} />
          <SubmitButton pendingLabel="Approving…" size="sm">
            Approve studio
          </SubmitButton>
        </form>
      </div>

      <div className="space-y-3">
        <p className="font-mono text-[0.625rem] tracking-[0.14em] text-muted-foreground uppercase">
          Reject
        </p>
        <form action={rejectAction} className="space-y-3">
          <input type="hidden" name="vendorId" value={vendorId} />
          <input type="hidden" name="decision" value="reject" />
          <FormMessage state={rejectState} />
          <label htmlFor={noteId} className="sr-only">
            Reason for rejection
          </label>
          <Textarea
            id={noteId}
            name="note"
            placeholder="Reason for rejection (shared with the applicant)"
            aria-invalid={rejectState.fieldErrors?.note ? true : undefined}
            aria-describedby={rejectState.fieldErrors?.note ? `${noteId}-error` : undefined}
            className="min-h-24"
          />
          {rejectState.fieldErrors?.note ? (
            <p id={`${noteId}-error`} className="text-sm text-danger">
              {rejectState.fieldErrors.note}
            </p>
          ) : null}
          <SubmitButton pendingLabel="Rejecting…" variant="secondary" size="sm">
            Reject application
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
