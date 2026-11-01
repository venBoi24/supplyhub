"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/features/catalog/money";
import { initialFormState } from "@/features/identity/form-state";
import { refundPaymentAction } from "@/features/payments/admin-actions";

export interface RefundFormProps {
  orderNumber: string;
  paymentId: string;
  remainingCents: number;
  currency: string;
}

export function RefundForm({ orderNumber, paymentId, remainingCents, currency }: RefundFormProps) {
  const [state, action] = useActionState(refundPaymentAction, initialFormState);
  const amountId = `refund-amount-${paymentId}`;
  const reasonId = `refund-reason-${paymentId}`;

  return (
    <form action={action} className="mt-5 space-y-4 border-t border-border pt-5">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="paymentId" value={paymentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Refund amount"
          htmlFor={amountId}
          hint={`Up to ${formatMoney(remainingCents, currency)}`}
          error={state.fieldErrors?.amount}
        >
          <Input
            id={amountId}
            name="amount"
            inputMode="decimal"
            defaultValue={(remainingCents / 100).toFixed(2)}
            aria-invalid={state.fieldErrors?.amount ? true : undefined}
            aria-describedby={state.fieldErrors?.amount ? `${amountId}-error` : undefined}
          />
        </Field>

        <Field
          label="Reason"
          htmlFor={reasonId}
          hint="Shared with the customer"
          error={state.fieldErrors?.reason}
        >
          <Input
            id={reasonId}
            name="reason"
            placeholder="Damaged item returned"
            aria-invalid={state.fieldErrors?.reason ? true : undefined}
            aria-describedby={state.fieldErrors?.reason ? `${reasonId}-error` : undefined}
          />
        </Field>
      </div>

      <FormMessage state={state} />
      <SubmitButton
        pendingLabel="Recording refund…"
        variant="secondary"
        size="sm"
        className="w-auto"
      >
        Record refund
      </SubmitButton>
    </form>
  );
}
