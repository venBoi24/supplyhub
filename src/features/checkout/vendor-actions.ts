"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAuditEvent } from "@/server/audit/audit-log";
import { requireApprovedVendor } from "@/server/auth/guards";
import { getDatabase } from "@/server/db/client";
import { logger } from "@/lib/logging/logger";
import type { FormState } from "@/features/identity/form-state";
import { nextVendorOrderStatus } from "./status";

const fulfillmentSchema = z.object({
  vendorOrderId: z.string().uuid(),
  status: z.enum(["PROCESSING", "SHIPPED", "DELIVERED"]),
});

export async function updateVendorOrderStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const { actor, vendorId } = await requireApprovedVendor("/vendor/orders");
  const parsed = fulfillmentSchema.safeParse({
    vendorOrderId: formData.get("vendorOrderId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: "The order update is invalid." };

  const database = getDatabase();
  try {
    const result = await database.$transaction(async (transaction) => {
      const current = await transaction.vendorOrder.findFirst({
        where: { id: parsed.data.vendorOrderId, vendorId },
        select: { id: true, orderId: true, status: true },
      });
      if (!current) return "not-found" as const;
      const allowedNext = nextVendorOrderStatus(current.status);
      if (!allowedNext || allowedNext !== parsed.data.status) return "invalid-transition" as const;

      const changed = await transaction.vendorOrder.updateMany({
        where: { id: current.id, vendorId, status: current.status },
        data: { status: parsed.data.status },
      });
      if (changed.count !== 1) return "conflict" as const;

      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "ORDER_STATUS_UPDATED",
        targetType: "vendor_order",
        targetId: current.id,
        metadata: { from: current.status, to: parsed.data.status },
      });
      const siblingStatuses = await transaction.vendorOrder.findMany({
        where: { orderId: current.orderId },
        select: { status: true },
      });
      const aggregate = siblingStatuses.every((entry) => entry.status === "DELIVERED")
        ? "DELIVERED"
        : siblingStatuses.every((entry) => ["SHIPPED", "DELIVERED"].includes(entry.status))
          ? "SHIPPED"
          : siblingStatuses.some((entry) =>
                ["PROCESSING", "SHIPPED", "DELIVERED"].includes(entry.status),
              )
            ? "PROCESSING"
            : null;
      if (aggregate) {
        const parent = await transaction.order.findUnique({
          where: { id: current.orderId },
          select: { status: true },
        });
        if (
          parent &&
          ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(parent.status) &&
          parent.status !== aggregate
        ) {
          await transaction.order.update({
            where: { id: current.orderId },
            data: { status: aggregate },
          });
          await recordAuditEvent(transaction, {
            actorId: actor.id,
            action: "ORDER_STATUS_UPDATED",
            targetType: "order",
            targetId: current.orderId,
            metadata: { from: parent.status, to: aggregate, source: "vendor_fulfillment" },
          });
        }
      }
      return "updated" as const;
    });
    if (result !== "updated") {
      return {
        status: "error",
        message:
          result === "not-found"
            ? "That order is no longer available."
            : "That order changed or cannot move to the requested status.",
      };
    }
    revalidatePath("/vendor/orders");
    revalidatePath("/account/orders");
    return { status: "success", message: "Order status updated." };
  } catch (error) {
    logger.error("vendor.order_status_update_failed", { actorId: actor.id, error });
    return { status: "error", message: "The order could not be updated." };
  }
}
