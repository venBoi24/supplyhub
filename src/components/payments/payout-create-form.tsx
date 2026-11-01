"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatMoney } from "@/features/catalog/money";
import { initialFormState } from "@/features/identity/form-state";
import { createPayoutAction } from "@/features/payments/admin-actions";

export interface PayoutVendorOption {
  id: string;
  name: string;
  availableCents: number;
}

export interface PayoutCreateFormProps {
  vendors: PayoutVendorOption[];
  currency: string;
  defaultPeriodStart: string;
  defaultPeriodEnd: string;
}

export function PayoutCreateForm({
  vendors,
  currency,
  defaultPeriodStart,
  defaultPeriodEnd,
}: PayoutCreateFormProps) {
  const [state, action] = useActionState(createPayoutAction, initialFormState);
  const payables = vendors.filter((vendor) => vendor.availableCents > 0);

  return (
    <form action={action} className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="font-display text-xl font-medium tracking-[-0.02em]">Record a payout</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Payouts are created manually and reserve the studio&apos;s available balance. Mark a
          payout paid once the transfer leaves your account, then reconcile it against the
          statement.
        </p>
      </div>

      {payables.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          No studio has an available balance yet. Confirmed payments create vendor earnings first.
        </p>
      ) : (
        <>
          <Field label="Studio" htmlFor="payout-vendor" error={state.fieldErrors?.vendorId}>
            <Select id="payout-vendor" name="vendorId" defaultValue={payables[0]?.id}>
              {payables.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} — {formatMoney(vendor.availableCents, currency)} available
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Amount" htmlFor="payout-amount" error={state.fieldErrors?.amount}>
              <Input
                id="payout-amount"
                name="amount"
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={state.fieldErrors?.amount ? true : undefined}
                aria-describedby={state.fieldErrors?.amount ? "payout-amount-error" : undefined}
              />
            </Field>
            <Field
              label="Period start"
              htmlFor="payout-start"
              error={state.fieldErrors?.periodStart}
            >
              <Input
                id="payout-start"
                name="periodStart"
                type="date"
                defaultValue={defaultPeriodStart}
                aria-invalid={state.fieldErrors?.periodStart ? true : undefined}
              />
            </Field>
            <Field label="Period end" htmlFor="payout-end" error={state.fieldErrors?.periodEnd}>
              <Input
                id="payout-end"
                name="periodEnd"
                type="date"
                defaultValue={defaultPeriodEnd}
                aria-invalid={state.fieldErrors?.periodEnd ? true : undefined}
              />
            </Field>
          </div>

          <Field label="Note" htmlFor="payout-note" hint="Optional" error={state.fieldErrors?.note}>
            <Textarea
              id="payout-note"
              name="note"
              className="min-h-20"
              placeholder="Bank transfer reference or payment run"
            />
          </Field>

          <FormMessage state={state} />
          <SubmitButton pendingLabel="Recording payout…" className="w-auto">
            Record payout
          </SubmitButton>
        </>
      )}

      {payables.length === 0 ? <FormMessage state={state} /> : null}
    </form>
  );
}
