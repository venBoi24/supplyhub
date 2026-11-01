"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { canApplyForVendor, canReviewVendorApplication } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { AUTH_RATE_LIMITS } from "@/server/security/auth-rate-limits";
import { consumeRateLimits } from "@/server/security/rate-limit";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import { vendorApplicationSchema, vendorReviewSchema } from "@/features/identity/validation";

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export async function applyForVendorAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in?next=/vendor/apply");
  }

  if (!canApplyForVendor(actor)) {
    return {
      status: "error",
      message: "This account already has a vendor application or is not eligible to apply.",
    };
  }

  if (
    !consumeRateLimits([
      { key: `vendor-apply:${actor.id}`, rule: AUTH_RATE_LIMITS.vendorApplyByUser },
    ])
  ) {
    return {
      status: "error",
      message: "Too many application attempts. Wait a little while and try again.",
    };
  }

  const parsed = vendorApplicationSchema.safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
    description: formValue(formData, "description"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  try {
    await getDatabase().$transaction(async (transaction) => {
      const vendor = await transaction.vendor.create({
        data: {
          ownerId: actor.id,
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: parsed.data.description,
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
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        fieldErrors: {
          slug: "That studio handle is already taken. Choose another one.",
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

  if (!actor) {
    redirect("/sign-in?next=/admin/vendors");
  }

  if (!canReviewVendorApplication(actor)) {
    return { status: "error", message: "You are not allowed to review vendor applications." };
  }

  const parsed = vendorReviewSchema.safeParse({
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
    return { status: "error", message: "That vendor application no longer exists." };
  }

  if (vendor.status !== "PENDING") {
    return {
      status: "error",
      message: "That application has already been reviewed.",
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
      message: "Another administrator reviewed that application first. Reload to see the result.",
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
