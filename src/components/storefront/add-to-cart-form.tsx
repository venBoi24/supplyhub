"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SubmitButton } from "@/components/forms/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { addToCartAction } from "@/features/cart/actions";
import { initialFormState } from "@/features/identity/form-state";
import { useT } from "@/i18n/client";

import { QuantityStepper } from "./quantity-stepper";

export interface AddToCartFormProps {
  productId: string;
  available: number;
}

export function AddToCartForm({ productId, available }: AddToCartFormProps) {
  const [state, formAction] = useActionState(addToCartAction, initialFormState);
  const t = useT();

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-4">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <p id="quantity-label" className="eyebrow mb-2 text-muted-foreground">
          {t("common.quantity")}
        </p>
        <div role="group" aria-labelledby="quantity-label">
          <QuantityStepper name="quantity" max={available} />
        </div>
      </div>
      <SubmitButton pendingLabel={t("product.adding")} size="lg" className="w-auto">
        {t("common.addToCart")}
      </SubmitButton>
      <div className="basis-full">
        <FormMessage state={state} />
        {state.status === "success" ? (
          <p className="mt-2 text-sm">
            <Link
              href="/cart"
              className="font-medium text-accent underline-offset-4 hover:underline"
            >
              {t("product.reviewCart")}
            </Link>
          </p>
        ) : null}
      </div>
    </form>
  );
}
