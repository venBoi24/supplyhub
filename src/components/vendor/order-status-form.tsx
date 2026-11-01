"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { initialFormState } from "@/features/identity/form-state";
import { updateVendorOrderStatusAction } from "@/features/checkout/vendor-actions";
import { nextVendorOrderStatus } from "@/features/checkout/status";

export function OrderStatusForm({ orderId, status }: { orderId: string; status: string }) {
  const [state, action, pending] = useActionState(updateVendorOrderStatusAction, initialFormState);
  const next = nextVendorOrderStatus(status as Parameters<typeof nextVendorOrderStatus>[0]);
  if (!next) return <span className="text-xs text-muted-foreground">No further action</span>;

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="vendorOrderId" value={orderId} />
      <input type="hidden" name="status" value={next} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : `Mark ${next.toLowerCase()}`}
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
