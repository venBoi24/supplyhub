"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { initialFormState } from "@/features/identity/form-state";
import { updateVendorOrderStatusAction } from "@/features/checkout/vendor-actions";
import { nextVendorOrderStatus, ORDER_STATUS_LABEL_KEYS } from "@/features/checkout/status";
import { useT } from "@/i18n/client";
import type { OrderStatus } from "@/generated/prisma/enums";

export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const t = useT();
  const [state, action, pending] = useActionState(updateVendorOrderStatusAction, initialFormState);
  const next = nextVendorOrderStatus(status as OrderStatus);
  if (!next)
    return <span className="text-xs text-muted-foreground">{t("studio.noFurtherAction")}</span>;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="vendorOrderId" value={orderId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending
          ? t("common.saving")
          : t("studio.markStatus", { status: t(ORDER_STATUS_LABEL_KEYS[next]) })}
      </Button>
      {state.message ? (
        <p
          aria-live="polite"
          className={state.status === "error" ? "text-xs text-danger" : "text-xs text-success"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
