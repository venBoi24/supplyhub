"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Field, Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { initialFormState } from "@/features/identity/form-state";
import { createPayoutAction } from "@/features/payments/admin-actions";
import { useI18n } from "@/i18n/client";

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
  const { t, formatCurrency } = useI18n();
  const payables = vendors.filter((vendor) => vendor.availableCents > 0);

  return (
    <form action={action} className="w-full min-w-0 space-y-4 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="font-display text-xl font-medium tracking-[-0.02em]">
          {t("payments.payout.recordTitle")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {t("payments.payout.recordIntro")}
        </p>
      </div>

      {payables.length === 0 ? (
        <p className="rounded-md border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-muted-foreground">
          {t("payments.payout.noBalance")}
        </p>
      ) : (
        <>
          <Field
            label={t("products.studio")}
            htmlFor="payout-vendor"
            error={state.fieldErrors?.vendorId}
          >
            <Select id="payout-vendor" name="vendorId" defaultValue={payables[0]?.id} className="min-w-0">
              {payables.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {t("payments.payout.availableOption", {
                    name: vendor.name,
                    amount: formatCurrency(vendor.availableCents, currency),
                  })}
                </option>
              ))}
            </Select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              label={t("payments.payout.amount")}
              htmlFor="payout-amount"
              error={state.fieldErrors?.amount}
            >
              <Input
                id="payout-amount"
                name="amount"
                inputMode="decimal"
                className="min-w-0"
                placeholder="0.00"
                aria-invalid={state.fieldErrors?.amount ? true : undefined}
                aria-describedby={state.fieldErrors?.amount ? "payout-amount-error" : undefined}
              />
            </Field>
            <Field
              label={t("payments.payout.periodStart")}
              htmlFor="payout-start"
              error={state.fieldErrors?.periodStart}
            >
              <Input
                id="payout-start"
                name="periodStart"
                type="date"
                className="min-w-0"
                defaultValue={defaultPeriodStart}
                aria-invalid={state.fieldErrors?.periodStart ? true : undefined}
              />
            </Field>
            <Field
              label={t("payments.payout.periodEnd")}
              htmlFor="payout-end"
              error={state.fieldErrors?.periodEnd}
            >
              <Input
                id="payout-end"
                name="periodEnd"
                type="date"
                className="min-w-0"
                defaultValue={defaultPeriodEnd}
                aria-invalid={state.fieldErrors?.periodEnd ? true : undefined}
              />
            </Field>
          </div>

          <Field
            label={t("payments.payout.note")}
            htmlFor="payout-note"
            hint={t("common.optional")}
            error={state.fieldErrors?.note}
          >
            <Textarea
              id="payout-note"
              name="note"
              className="min-h-20"
              placeholder={t("payments.payout.notePlaceholder")}
            />
          </Field>

          <FormMessage state={state} />
          <SubmitButton pendingLabel={t("payments.payout.pendingRecording")} className="w-auto">
            {t("payments.payout.submit")}
          </SubmitButton>
        </>
      )}

      {payables.length === 0 ? <FormMessage state={state} /> : null}
    </form>
  );
}
