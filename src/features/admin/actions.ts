"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { FormState } from "@/features/identity/form-state";
import { getServerI18n } from "@/i18n/server";
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

const adminAppealEditSchema = z.object({
  userId: z.string().uuid(),
  vendorId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  vendorName: z.string().trim().min(2).max(100),
  appealReason: z.string().trim().min(20).max(1000),
});

export async function editAdminUserAppealAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  const parsed = adminAppealEditSchema.safeParse({
    userId: formData.get("userId"),
    vendorId: formData.get("vendorId"),
    name: formData.get("name"),
    vendorName: formData.get("vendorName"),
    appealReason: formData.get("appealReason"),
  });
  if (!parsed.success) {
    return { status: "error", message: t("admin.errors.appealFieldsInvalid") };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const vendor = await transaction.vendor.findFirst({
        where: {
          id: parsed.data.vendorId,
          ownerId: parsed.data.userId,
          status: "REJECTED",
          appealedAt: { not: null },
        },
        select: { id: true, name: true, appealReason: true },
      });
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, name: true },
      });
      if (!vendor || !target || target.role === "ADMIN") throw new Error("protected-user");

      await transaction.user.update({
        where: { id: target.id },
        data: { name: parsed.data.name },
      });
      await transaction.vendor.update({
        where: { id: vendor.id },
        data: { name: parsed.data.vendorName, appealReason: parsed.data.appealReason },
      });
      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "USER_UPDATED",
        targetType: "user",
        targetId: target.id,
        metadata: {
          nameChanged: target.name !== parsed.data.name,
          vendorNameChanged: vendor.name !== parsed.data.vendorName,
          appealReasonChanged: vendor.appealReason !== parsed.data.appealReason,
        },
      });
    });
    revalidatePath("/admin/users");
    revalidatePath("/admin/vendors");
    revalidatePath("/vendor");
    return { status: "success", message: t("admin.success.userAppealUpdated") };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return {
        status: "error",
        message: t("admin.errors.appealProtected"),
      };
    }
    logger.error("admin.user_appeal_edit_failed", {
      actorId: actor.id,
      targetId: parsed.data.userId,
      error,
    });
    return { status: "error", message: t("admin.errors.userAppealUpdateFailed") };
  }
}

export async function updateUserStatusAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  const parsed = userStatusSchema.safeParse({
    userId: formData.get("userId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: t("admin.errors.userUpdateInvalid") };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: t("admin.errors.selfStatusForbidden") };
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
    return { status: "success", message: t("admin.success.accountStatusUpdated") };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: t("admin.errors.adminNotSuspendable") };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      logger.warn("admin.user_status_update_rejected", {
        actorId: actor.id,
        targetId: parsed.data.userId,
      });
    } else {
      logger.error("admin.user_status_update_failed", { actorId: actor.id, error });
    }
    return { status: "error", message: t("admin.errors.accountStatusUpdateFailed") };
  }
}

export async function editAdminUserAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  const parsed = adminUserEditSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { status: "error", message: t("admin.errors.nameEmailInvalid") };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: t("admin.errors.selfEditForbidden") };
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
    return { status: "success", message: t("admin.success.accountDetailsUpdated") };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: t("admin.errors.adminProtected") };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { status: "error", message: t("admin.errors.emailInUse") };
    }
    logger.error("admin.user_edit_failed", {
      actorId: actor.id,
      targetId: parsed.data.userId,
      error,
    });
    return { status: "error", message: t("admin.errors.accountUpdateFailed") };
  }
}

export async function deleteAdminUserAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  const parsed = adminUserDeleteSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success)
    return { status: "error", message: t("admin.errors.accountReferenceInvalid") };
  if (parsed.data.userId === actor.id) {
    return { status: "error", message: t("admin.errors.selfDeleteForbidden") };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const target = await transaction.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true, role: true, vendor: { select: { id: true } } },
      });
      if (!target || target.role === "ADMIN") throw new Error("protected-user");

      // Cascade-delete dependent records so accounts with history can be removed.
      const vendorId = target.vendor?.id;
      if (vendorId) {
        await transaction.productImage.deleteMany({
          where: { product: { vendorId } },
        });
        await transaction.inventoryMovement.deleteMany({
          where: { product: { vendorId } },
        });
        await transaction.cartItem.deleteMany({
          where: { product: { vendorId } },
        });
        await transaction.commissionLedger.deleteMany({ where: { vendorId } });
        await transaction.payout.deleteMany({ where: { vendorId } });
        await transaction.vendorOrder.deleteMany({ where: { vendorId } });
        await transaction.product.deleteMany({ where: { vendorId } });
        await transaction.vendorDepartment.deleteMany({ where: { vendorId } });
        await transaction.vendor.delete({ where: { id: vendorId } });
      }

      // Customer order chain.
      const orders = await transaction.order.findMany({
        where: { customerId: target.id },
        select: { id: true },
      });
      const orderIds = orders.map((order) => order.id);
      if (orderIds.length > 0) {
        await transaction.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.vendorOrder.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.commissionLedger.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.refund.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.payment.deleteMany({ where: { orderId: { in: orderIds } } });
        await transaction.order.deleteMany({ where: { id: { in: orderIds } } });
      }

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
    return { status: "success", message: t("admin.success.accountDeleted") };
  } catch (error) {
    if (error instanceof Error && error.message === "protected-user") {
      return { status: "error", message: t("admin.errors.adminProtected") };
    }
    if (error instanceof Error && error.message === "account-has-records") {
      return {
        status: "error",
        message: t("admin.errors.accountHasRecords"),
      };
    }
    logger.error("admin.user_delete_failed", {
      actorId: actor.id,
      targetId: parsed.data.userId,
      error,
    });
    return { status: "error", message: t("admin.errors.accountDeleteFailed") };
  }
}
