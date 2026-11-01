"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { markPayoutPaidAction, reconcilePayoutAction } from "@/features/payments/admin-actions";
import type { PayoutStatus } from "@/generated/prisma/enums";

export function PayoutActions({ payoutId, status }: { payoutId: string; status: PayoutStatus }) {
  const [paidState, paidAction] = useActionState(markPayoutPaidAction, initialFormState);
  const [reconcileState, reconcileAction] = useActionState(reconcilePayoutAction, initialFormState);

  if (status === "RECONCILED" || status === "FAILED") {
    return null;
  }

  if (status === "PAID") {
    return (
      <form action={reconcileAction} className="mt-4 space-y-3">
        <input type="hidden" name="payoutId" value={payoutId} />
        <FormMessage state={reconcileState} />
        <SubmitButton pendingLabel="Reconciling…" variant="secondary" size="sm" className="w-auto">
          Mark reconciled
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={paidAction} className="mt-4 space-y-3">
      <input type="hidden" name="payoutId" value={payoutId} />
      <FormMessage state={paidState} />
      <SubmitButton pendingLabel="Updating…" variant="secondary" size="sm" className="w-auto">
        Mark as paid
      </SubmitButton>
    </form>
  );
}
