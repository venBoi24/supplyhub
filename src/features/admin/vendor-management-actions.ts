"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/features/identity/form-state";
import { firstFieldErrors, formValue } from "@/features/identity/form-state";
import { studioProfileSchema } from "@/features/catalog/validation";
import { logger } from "@/lib/logging/logger";
import { canPerformAdminAction } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getDatabase } from "@/server/db/client";

const adminVendorProfileSchema = z.object({
  userId: z.uuid(),
  vendorId: z.uuid(),
  name: z.string().trim().min(2).max(80),
});

export async function updateVendorProfileForUserAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await getSessionActor();
  if (!actor || !canPerformAdminAction(actor)) {
    return { status: "error", message: "Administrator access is required." };
  }

  const profile = adminVendorProfileSchema.safeParse({
    userId: formValue(formData, "userId"),
    vendorId: formValue(formData, "vendorId"),
    name: formValue(formData, "name"),
  });
  const details = studioProfileSchema.safeParse({
    contactPhone: formValue(formData, "contactPhone"),
    departmentIds: formData
      .getAll("departmentIds")
      .filter((value): value is string => typeof value === "string"),
    city: formValue(formData, "city"),
    street: formValue(formData, "street"),
    address: formValue(formData, "address"),
    latitude: formValue(formData, "latitude"),
    longitude: formValue(formData, "longitude"),
    discipline: formValue(formData, "discipline"),
    story: formValue(formData, "story"),
    monogram: formValue(formData, "monogram"),
  });
  if (!profile.success)
    return { status: "error", message: "The account reference or name is invalid." };
  if (!details.success) return { status: "error", fieldErrors: firstFieldErrors(details.error) };

  try {
    await getDatabase().$transaction(async (transaction) => {
      const vendor = await transaction.vendor.findFirst({
        where: { id: profile.data.vendorId, ownerId: profile.data.userId },
        select: { id: true },
      });
      const target = await transaction.user.findUnique({
        where: { id: profile.data.userId },
        select: { id: true, name: true, role: true },
      });
      if (!vendor || !target || target.role === "ADMIN") throw new Error("invalid-target");
      const activeDepartments = await transaction.category.count({
        where: { id: { in: details.data.departmentIds }, status: "ACTIVE" },
      });
      if (activeDepartments !== new Set(details.data.departmentIds).size) {
        throw new Error("invalid-departments");
      }

      await transaction.user.update({
        where: { id: target.id },
        data: { name: profile.data.name },
      });
      await transaction.vendor.update({
        where: { id: vendor.id },
        data: {
          location: [details.data.address, details.data.street, details.data.city].join(", "),
          city: details.data.city,
          street: details.data.street,
          address: details.data.address,
          latitude: details.data.latitude?.toFixed(7) ?? null,
          longitude: details.data.longitude?.toFixed(7) ?? null,
          discipline: details.data.discipline,
          contactPhone: details.data.contactPhone,
          story: details.data.story,
          monogram: details.data.monogram || profile.data.name.slice(0, 2).toUpperCase(),
          departments: {
            deleteMany: {},
            create: details.data.departmentIds.map((categoryId) => ({ categoryId })),
          },
        },
      });
      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "USER_UPDATED",
        targetType: "user",
        targetId: target.id,
        metadata: {
          nameChanged: target.name !== profile.data.name,
          vendorProfileUpdated: true,
        },
      });
    });
    revalidatePath("/admin/users");
    revalidatePath(`/admin/users/${profile.data.userId}/inventory`);
    revalidatePath("/vendor");
    revalidatePath("/vendors");
    revalidatePath("/", "layout");
    return { status: "success", message: "Vendor profile and map location saved." };
  } catch (error) {
    if (error instanceof Error && error.message === "invalid-target") {
      return { status: "error", message: "That vendor profile is not available for this account." };
    }
    if (error instanceof Error && error.message === "invalid-departments") {
      return {
        status: "error",
        fieldErrors: { departmentIds: "Choose active departments from the list." },
      };
    }
    logger.error("admin.vendor_profile_update_failed", {
      actorId: actor.id,
      targetId: profile.data.userId,
      error,
    });
    return { status: "error", message: "The vendor profile could not be updated." };
  }
}
