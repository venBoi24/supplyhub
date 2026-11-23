"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { Textarea } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { initialFormState } from "@/features/identity/form-state";
import { submitVendorAppealAction } from "@/features/vendors/actions";
import { useT } from "@/i18n/client";

export function VendorAppealForm() {
  const t = useT();
  const [state, action] = useActionState(submitVendorAppealAction, initialFormState);

  return (
    <form action={action} className="mt-5 grid max-w-2xl gap-3">
      <label htmlFor="vendor-appeal-reason" className="text-sm font-medium">
        {t("studio.appealQuestion")}
      </label>
      <Textarea
        id="vendor-appeal-reason"
        name="reason"
        minLength={20}
        maxLength={1000}
        required
        className="min-h-32"
        placeholder={t("studio.appealPlaceholder")}
        aria-invalid={state.fieldErrors?.reason ? true : undefined}
        aria-describedby={state.fieldErrors?.reason ? "vendor-appeal-reason-error" : undefined}
      />
      {state.fieldErrors?.reason ? (
        <p id="vendor-appeal-reason-error" className="text-sm text-danger">
          {state.fieldErrors.reason}
        </p>
      ) : null}
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingLabel={t("studio.sendingAppeal")} variant="secondary" size="sm">
          {t("studio.submitAppeal")}
        </SubmitButton>
      </div>
    </form>
  );
}
