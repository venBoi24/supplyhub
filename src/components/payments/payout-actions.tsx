"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { markPayoutPaidAction, reconcilePayoutAction } from "@/features/payments/admin-actions";
import { useT } from "@/i18n/client";
import type { PayoutStatus } from "@/generated/prisma/enums";

export function PayoutActions({ payoutId, status }: { payoutId: string; status: PayoutStatus }) {
  const t = useT();
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
        <SubmitButton
          pendingLabel={t("payments.payout.pendingReconciling")}
          variant="secondary"
          size="sm"
          className="w-auto"
        >
          {t("payments.payout.markReconciled")}
        </SubmitButton>
      </form>
    );
  }

  return (
    <form action={paidAction} className="mt-4 space-y-3">
      <input type="hidden" name="payoutId" value={payoutId} />
      <FormMessage state={paidState} />
      <SubmitButton
        pendingLabel={t("payments.payout.pendingUpdating")}
        variant="secondary"
        size="sm"
        className="w-auto"
      >
        {t("payments.payout.markPaid")}
      </SubmitButton>
    </form>
  );
}
