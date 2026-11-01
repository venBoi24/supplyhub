"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { canManageCategories, canModerateCatalog } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";

import { categoryInputSchema, productFeatureSchema, productModerationSchema } from "./validation";

const uuidSchema = z.uuid();

function asUuid(value: string): string | null {
  return uuidSchema.safeParse(value).success ? value : null;
}

function revalidateCatalog(): void {
  revalidatePath("/", "layout");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function requireAdmin(nextPath: string) {
  const actor = await getSessionActor();

  if (!actor) {
    redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
  }

  if (!canModerateCatalog(actor)) {
    redirect("/");
  }

  return actor;
}

export async function moderateProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/products");

  const parsed = productModerationSchema.safeParse({
    productId: formValue(formData, "productId"),
    decision: formValue(formData, "decision"),
    note: formValue(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();
  const product = await database.product.findUnique({
    where: { id: parsed.data.productId },
    select: {
      id: true,
      status: true,
      category: { select: { status: true } },
      _count: { select: { images: { where: { status: "APPROVED" } } } },
    },
  });

  if (!product) {
    return { status: "error", message: "That object no longer exists." };
  }

  if (product.status !== "PENDING_REVIEW") {
    return { status: "error", message: "That object is not waiting for review." };
  }

  const approving = parsed.data.decision === "approve";

  if (approving && product.category.status !== "ACTIVE") {
    return {
      status: "error",
      message: "The department is archived. Restore it before publishing this object.",
    };
  }

  if (approving && product._count.images === 0) {
    return { status: "error", message: "Publish needs at least one approved image." };
  }

  const nextStatus = approving ? "PUBLISHED" : "REJECTED";
  const now = new Date();

  const reviewed = await database.$transaction(async (transaction) => {
    const updated = await transaction.product.updateMany({
      where: { id: product.id, status: "PENDING_REVIEW" },
      data: approving
        ? {
            status: "PUBLISHED",
            publishedAt: now,
            reviewedAt: now,
            reviewedById: actor.id,
            reviewNote: null,
            archivedAt: null,
          }
        : {
            status: "REJECTED",
            reviewedAt: now,
            reviewedById: actor.id,
            reviewNote: parsed.data.note,
            featured: false,
          },
    });

    if (updated.count !== 1) {
      return false;
    }

    await recordAuditEvent(transaction, {
      actorId: actor.id,
      action: approving ? "PRODUCT_PUBLISHED" : "PRODUCT_REJECTED",
      targetType: "product",
      targetId: product.id,
      metadata: { previousStatus: "PENDING_REVIEW", newStatus: nextStatus },
    });

    return true;
  });

  if (!reviewed) {
    return {
      status: "error",
      message: "Another administrator reviewed that object first. Reload to see the result.",
    };
  }

  logger.info("product.moderated", {
    actorId: actor.id,
    productId: product.id,
    decision: nextStatus,
  });
  revalidateCatalog();
  redirect(`/admin/products?reviewed=${nextStatus.toLowerCase()}`);
}

export async function featureProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/products");

  const parsed = productFeatureSchema.safeParse({
    productId: formValue(formData, "productId"),
    featured: formValue(formData, "featured"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const featured = parsed.data.featured === "1";
  const database = getDatabase();
  const product = await database.product.findUnique({
    where: { id: parsed.data.productId },
    select: { id: true, status: true, featured: true },
  });

  if (!product) {
    return { status: "error", message: "That object no longer exists." };
  }

  if (featured && product.status !== "PUBLISHED") {
    return { status: "error", message: "Only published objects can be featured." };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, status: product.status, featured: product.featured },
    data: { featured },
  });

  if (updated.count !== 1) {
    return { status: "error", message: "That object changed while you were editing. Reload." };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "PRODUCT_FEATURED",
      targetType: "product",
      targetId: product.id,
      metadata: { featured },
    }),
  );

  logger.info("product.feature_changed", { actorId: actor.id, productId: product.id, featured });
  revalidateCatalog();
  redirect("/admin/products?featured=1");
}

export async function saveCategoryAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/categories");

  if (!canManageCategories(actor)) {
    return { status: "error", message: "You are not allowed to manage departments." };
  }

  const rawCategoryId = formValue(formData, "categoryId");
  const categoryId = rawCategoryId ? asUuid(rawCategoryId) : null;

  if (rawCategoryId && !categoryId) {
    return { status: "error", message: "That department reference is invalid." };
  }

  const parsed = categoryInputSchema.safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
    headline: formValue(formData, "headline"),
    description: formValue(formData, "description"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();

  try {
    if (!categoryId) {
      const highest = await database.category.aggregate({ _max: { sortOrder: true } });

      const created = await database.$transaction(async (transaction) => {
        const category = await transaction.category.create({
          data: {
            ...parsed.data,
            status: "ACTIVE",
            sortOrder: (highest._max.sortOrder ?? -1) + 1,
          },
          select: { id: true, slug: true },
        });

        await recordAuditEvent(transaction, {
          actorId: actor.id,
          action: "CATEGORY_CREATED",
          targetType: "category",
          targetId: category.id,
          metadata: { slug: category.slug },
        });

        return category;
      });

      logger.info("category.created", { actorId: actor.id, categoryId: created.id });
      revalidateCatalog();
      redirect(`/admin/categories/${created.id}?saved=1`);
    }

    const existing = await database.category.findUnique({
      where: { id: categoryId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return { status: "error", message: "That department no longer exists." };
    }

    if (existing.status === "ARCHIVED") {
      return { status: "error", message: "Archived departments cannot be edited." };
    }

    await database.$transaction(async (transaction) => {
      await transaction.category.update({
        where: { id: existing.id },
        data: parsed.data,
      });

      await recordAuditEvent(transaction, {
        actorId: actor.id,
        action: "CATEGORY_UPDATED",
        targetType: "category",
        targetId: existing.id,
        metadata: { slug: parsed.data.slug },
      });
    });

    logger.info("category.updated", { actorId: actor.id, categoryId: existing.id });
    revalidateCatalog();
    redirect(`/admin/categories/${existing.id}?saved=1`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        status: "error",
        fieldErrors: { slug: "That handle is already in use. Choose another one." },
      };
    }

    throw error;
  }
}

export async function archiveCategoryAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/categories");

  if (!canManageCategories(actor)) {
    return { status: "error", message: "You are not allowed to manage departments." };
  }

  const categoryId = asUuid(formValue(formData, "categoryId"));

  if (!categoryId) {
    return { status: "error", message: "That department reference is invalid." };
  }

  const database = getDatabase();
  const category = await database.category.findUnique({
    where: { id: categoryId },
    select: {
      id: true,
      status: true,
      _count: { select: { products: { where: { status: "PUBLISHED" } } } },
    },
  });

  if (!category) {
    return { status: "error", message: "That department no longer exists." };
  }

  if (category.status === "ARCHIVED") {
    return { status: "success", message: "This department is already archived." };
  }

  if (category._count.products > 0) {
    return {
      status: "error",
      message: "Move published objects out of this department before archiving it.",
    };
  }

  const updated = await database.category.updateMany({
    where: { id: category.id, status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });

  if (updated.count !== 1) {
    return { status: "error", message: "That department already changed. Reload and retry." };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "CATEGORY_ARCHIVED",
      targetType: "category",
      targetId: category.id,
    }),
  );

  logger.info("category.archived", { actorId: actor.id, categoryId: category.id });
  revalidateCatalog();
  redirect("/admin/categories?archived=1");
}
