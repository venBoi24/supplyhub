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
import { emailField } from "@/features/identity/validation";

const adminUserEditSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  email: emailField,
});

const adminUserDeleteSchema = z.object({ userId: z.string().uuid() });

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

export async function editAdminUserAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: "Administrator access is required." };
  }

  const parsed = adminUserEditSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { status: "error", message: "Enter a valid name and email." };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: "You cannot edit your own account here." };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, email: true, name: true },
      });
      if (!target || target.role === "ADMIN") throw new Error("protected-user");
      const emailChanged = target.email !== parsed.data.email;
      await transaction.user.update({
        where: { id: target.id },
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          ...(emailChanged ? { emailVerifiedAt: null, sessionVersion: { increment: 1 } } : {}),
        },
      });
      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "USER_UPDATED",
        targetType: "user",
        targetId: target.id,
        metadata: { nameChanged: target.name !== parsed.data.name, emailChanged },
      });
    });
    revalidatePath("/admin/users");
    return { status: "success", message: "Account details updated." };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: "Administrator accounts are protected." };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: "That email address is already in use." };
    }
    logger.error("admin.user_edit_failed", {
      actorId: actor.id,
      targetId: parsed.data.userId,
      error,
    });
    return { status: "error", message: "The account could not be updated." };
  }
}

export async function deleteAdminUserAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: "Administrator access is required." };
  }

  const parsed = adminUserDeleteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return { status: "error", message: "The account reference is invalid." };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: "You cannot delete your own account." };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: {
          id: true,
          role: true,
          vendor: { select: { id: true } },
          _count: { select: { orders: true } },
        },
      });
      if (!target || target.role === "ADMIN") throw new Error("protected-user");
      if (target.vendor || target._count.orders > 0) throw new Error("account-has-records");

      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "USER_DELETED",
        targetType: "user",
        targetId: target.id,
        metadata: { role: target.role },
      });
      await transaction.user.delete({ where: { id: target.id } });
    });
    revalidatePath("/admin/users");
    return { status: "success", message: "Account deleted." };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: "Administrator accounts are protected." };
    }
    if (error instanceof Error && error.message === "account-has-records") {
      return {
        status: "error",
        message:
          "Accounts with vendor applications or orders cannot be deleted. Suspend them instead.",
      };
    }
    logger.error("admin.user_delete_failed", {
      actorId: actor.id,
      targetId: parsed.data.userId,
      error,
    });
    return { status: "error", message: "The account could not be deleted." };
  }
}
