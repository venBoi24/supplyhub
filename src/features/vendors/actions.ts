"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { getServerI18n } from "@/i18n/server";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { canApplyForVendor, canReviewVendorApplication } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimits } from "@/server/security/rate-limit";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import {
  createVendorAppealReviewSchema,
  createVendorAppealSchema,
  createVendorApplicationSchema,
  createVendorReviewSchema,
} from "@/features/identity/validation";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function applyForVendorAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();

  if (!actor) {
    redirect("/sign-in?next=/vendor/apply");
  }

  if (!canApplyForVendor(actor)) {
    return {
      status: "error",
      message: t("vendor.errors.notEligible"),
    };
  }

  if (
    !consumeRateLimits([
      { key: `vendor-apply:${actor.id}`, rule: AUTH_RATE_LIMITS.vendorApplyByUser },
    ])
  ) {
    return {
      status: "error",
      message: t("vendor.errors.applyRateLimited"),
    };
  }

  const parsed = createVendorApplicationSchema(t).safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
    description: formValue(formData, "description"),
    contactPhone: formValue(formData, "contactPhone"),
    departmentIds: formData
      .getAll("departmentIds")
      .filter((value): value is string => typeof value === "string"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const activeDepartments = await transaction.category.count({
        where: { id: { in: parsed.data.departmentIds }, status: "ACTIVE" },
      });
      if (activeDepartments !== new Set(parsed.data.departmentIds).size) {
        throw new Error("invalid-departments");
      }
      const vendor = await transaction.vendor.create({
        data: {
          ownerId: actor.id,
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description,
          contactPhone: parsed.data.contactPhone,
          departments: {
            create: parsed.data.departmentIds.map((categoryId) => ({ categoryId })),
          },
        },
        select: { id: true, slug: true },
      });

      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "VENDOR_APPLICATION_SUBMITTED",
        targetType: "vendor",
        targetId: vendor.id,
        metadata: { slug: vendor.slug },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-departments") {
      return {
        status: "error",
        fieldErrors: { departmentIds: t("studio.errors.departmentsInactive") },
      };
    }
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        fieldErrors: {
          slug: t("vendor.errors.handleTaken"),
        },
      };
    }

    throw error;
  }

  logger.info("vendor.application_submitted", { actorId: actor.id });
  revalidatePath("/vendor");
  revalidatePath("/vendor/apply");
  redirect("/vendor?submitted=1");
}

export async function reviewVendorApplicationAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();

  if (!actor) {
    redirect("/sign-in?next=/admin/vendors");
  }

  if (!canReviewVendorApplication(actor)) {
    return { status: "error", message: t("admin.errors.vendorReviewForbidden") };
  }

  const parsed = createVendorReviewSchema(t).safeParse({
    vendorId: formValue(formData, "vendorId"),
    decision: formValue(formData, "decision"),
    note: formValue(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const vendor = await getDatabase().vendor.findUnique({
    where: { id: parsed.data.vendorId },
    select: { id: true, ownerId: true, status: true },
  });

  if (!vendor) {
    return { status: "error", message: t("admin.errors.applicationGone") };
  }

  if (vendor.status !== "PENDING") {
    return {
      status: "error",
      message: t("admin.errors.applicationAlreadyReviewed"),
    };
  }

  const nextStatus = parsed.data.decision === "approve" ? "APPROVED" : "REJECTED";

  const reviewed = await getDatabase().$transaction(async (transaction) => {
    const updated = await transaction.vendor.updateMany({
      where: { id: vendor.id, status: "PENDING" },
      data: {
        status: nextStatus,
        reviewNote: parsed.data.note || null,
        reviewedAt: new Date(),
        reviewedById: actor.id,
      },
    });

    if (updated.count !== 1) {
      return false;
    }

    if (nextStatus === "APPROVED") {
      await transaction.user.updateMany({
        where: { id: vendor.ownerId, role: "CUSTOMER" },
        data: { role: "VENDOR" },
      });
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: nextStatus === "APPROVED" ? "VENDOR_APPROVED" : "VENDOR_REJECTED",
      targetType: "vendor",
      targetId: vendor.id,
      metadata: {
        previousStatus: "PENDING",
        newStatus: nextStatus,
      },
    });

    return true;
  });

  if (!reviewed) {
    return {
      status: "error",
      message: t("admin.errors.reviewedByOtherAdmin"),
    };
  }

  logger.info("vendor.application_reviewed", {
    actorId: actor.id,
    vendorId: vendor.id,
    decision: nextStatus,
  });
  revalidatePath("/admin/vendors");
  revalidatePath("/vendor");
  redirect(`/admin/vendors?reviewed=${nextStatus.toLowerCase()}`);
}

export async function submitVendorAppealAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor) redirect("/sign-in?next=/vendor");
  if (actor.status !== "ACTIVE") {
    return { status: "error", message: t("vendor.errors.activeAccountRequired") };
  }

  const parsed = createVendorAppealSchema(t).safeParse({ reason: formValue(formData, "reason") });
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };

  const submitted = await getDatabase().$transaction(async (transaction) => {
    const vendor = await transaction.vendor.findFirst({
      where: { ownerId: actor.id, status: "REJECTED", appealedAt: null },
      select: { id: true },
    });
    if (!vendor) return false;
    const update = await transaction.vendor.updateMany({
      where: { id: vendor.id, status: "REJECTED", appealedAt: null },
      data: { appealReason: parsed.data.reason, appealedAt: new Date() },
    });
    if (update.count !== 1) return false;
    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "VENDOR_APPEAL_SUBMITTED",
      targetType: "vendor",
      targetId: vendor.id,
    });
    return true;
  });
  if (!submitted) {
    return {
      status: "error",
      message: t("vendor.errors.appealOnceOnly"),
    };
  }
  revalidatePath("/vendor");
  revalidatePath("/admin/vendors");
  return { status: "success", message: t("vendor.success.appealSent") };
}

export async function reviewVendorAppealAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  const { t } = await getServerI18n();
  if (!actor || !canReviewVendorApplication(actor)) {
    return { status: "error", message: t("admin.errors.accessRequired") };
  }

  const parsed = createVendorAppealReviewSchema(t).safeParse({
    vendorId: formValue(formData, "vendorId"),
    decision: formValue(formData, "decision"),
    note: formValue(formData, "note"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };

  const status = parsed.data.decision === "approve" ? "APPROVED" : "REJECTED";
  const resolved = await getDatabase().$transaction(async (transaction) => {
    const vendor = await transaction.vendor.findFirst({
      where: {
        id: parsed.data.vendorId,
        status: "REJECTED",
        appealedAt: { not: null },
        appealReviewedAt: null,
      },
      select: { id: true, ownerId: true },
    });
    if (!vendor) return false;

    const update = await transaction.vendor.updateMany({
      where: {
        id: vendor.id,
        status: "REJECTED",
        appealedAt: { not: null },
        appealReviewedAt: null,
      },
      data: {
        status,
        appealReviewedAt: new Date(),
        appealReviewNote: parsed.data.note || null,
        ...(status === "APPROVED" ? { reviewedAt: new Date(), reviewedById: actor.id } : {}),
      },
    });
    if (update.count !== 1) return false;
    if (status === "APPROVED") {
      await transaction.user.updateMany({
        where: { id: vendor.ownerId, role: { in: ["CUSTOMER", "VENDOR"] } },
        data: {
          role: "VENDOR",
          status: "ACTIVE",
          sessionVersion: { increment: 1 },
        },
      });
    }
    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "VENDOR_APPEAL_REVIEWED",
      targetType: "vendor",
      targetId: vendor.id,
      metadata: { decision: status },
    });
    return true;
  });

  if (!resolved) {
    return { status: "error", message: t("admin.errors.appealUnavailable") };
  }
  revalidatePath("/admin/vendors");
  revalidatePath("/admin/users");
  revalidatePath("/vendor");
  return {
    status: "success",
    message:
      parsed.data.decision === "approve"
        ? t("admin.success.appealApproved")
        : t("admin.success.appealDeclined"),
  };
}
