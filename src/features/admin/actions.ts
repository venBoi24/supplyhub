"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { FormState } from "@/features/identity/form-state";
import { logger } from "@/lib/logging/logger";
import { canPerformAdminAction } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getDatabase } from "@/server/db/client";

const userStatusSchema = z.object({
  userId: z.string().uuid(),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function updateUserStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: "Administrator access is required." };
  }

  const parsed = userStatusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: "The user update is invalid." };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: "You cannot change your own account status." };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, status: true },
      });
      if (!target || target.role === "ADMIN") throw new Error("protected-user");
      if (target.status === parsed.data.status) return;

      await transaction.user.update({
        where: { id: target.id },
        data: { status: parsed.data.status, sessionVersion: { increment: 1 } },
      });
      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: parsed.data.status === "SUSPENDED" ? "USER_SUSPENDED" : "USER_REACTIVATED",
        targetType: "user",
        targetId: target.id,
        metadata: { role: target.role },
      });
    });
    revalidatePath("/admin/users");
    return { status: "success", message: "Account status updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: "Administrator accounts cannot be suspended here." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.warn("admin.user_status_update_rejected", {
        actorId: actor.id,
        targetId: parsed.data.userId,
      });
    } else {
      logger.error("admin.user_status_update_failed", { actorId: actor.id, error });
    }
    return { status: "error", message: "The account status could not be updated." };
  }
}
