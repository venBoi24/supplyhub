"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { getServerI18n } from "@/i18n/server";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { canManageCategories, canModerateCatalog } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { getStorage } from "@/server/storage/object-storage";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";

import {
  createCategoryInputSchema,
  createProductFeatureSchema,
  createProductModerationSchema,
} from "./validation";

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
  const { t } = await getServerI18n();

  const parsed = createProductModerationSchema(t).safeParse({
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
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  if (product.status !== "PENDING_REVIEW") {
    return { status: "error", message: t("admin.errors.notPendingReview") };
  }

  const approving = parsed.data.decision === "approve";

  if (approving && product.category.status !== "ACTIVE") {
    return {
      status: "error",
      message: t("admin.errors.departmentArchived"),
    };
  }

  if (approving && product._count.images === 0) {
    return { status: "error", message: t("admin.errors.approvedImageRequired") };
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
      message: t("admin.errors.reviewedByOtherAdmin"),
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
  const { t } = await getServerI18n();

  const parsed = createProductFeatureSchema(t).safeParse({
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
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  if (featured && product.status !== "PUBLISHED") {
    return { status: "error", message: t("admin.errors.featurePublishedOnly") };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, status: product.status, featured: product.featured },
    data: { featured },
  });

  if (updated.count !== 1) {
    return { status: "error", message: t("admin.errors.objectChanged") };
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
  const { t } = await getServerI18n();

  if (!canManageCategories(actor)) {
    return { status: "error", message: t("admin.errors.departmentsForbidden") };
  }

  const rawCategoryId = formValue(formData, "categoryId");
  const categoryId = rawCategoryId ? asUuid(rawCategoryId) : null;

  if (rawCategoryId && !categoryId) {
    return { status: "error", message: t("validation.departmentReferenceInvalid") };
  }

  const parsed = createCategoryInputSchema(t).safeParse({
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
      return { status: "error", message: t("admin.errors.departmentGone") };
    }

    if (existing.status === "ARCHIVED") {
      return { status: "error", message: t("admin.errors.departmentArchivedReadOnly") };
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
        fieldErrors: { slug: t("studio.errors.slugTaken") },
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
  const { t } = await getServerI18n();

  if (!canManageCategories(actor)) {
    return { status: "error", message: t("admin.errors.departmentsForbidden") };
  }

  const categoryId = asUuid(formValue(formData, "categoryId"));

  if (!categoryId) {
    return { status: "error", message: t("validation.departmentReferenceInvalid") };
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
    return { status: "error", message: t("admin.errors.departmentGone") };
  }

  if (category.status === "ARCHIVED") {
    return { status: "success", message: t("admin.success.departmentAlreadyArchived") };
  }

  if (category._count.products > 0) {
    return {
      status: "error",
      message: t("admin.errors.movePublishedFirst"),
    };
  }

  const updated = await database.category.updateMany({
    where: { id: category.id, status: "ACTIVE" },
    data: { status: "ARCHIVED" },
  });

  if (updated.count !== 1) {
    return { status: "error", message: t("admin.errors.departmentChanged") };
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
export async function hideAdminProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/posts");
  const { t } = await getServerI18n();
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  const database = getDatabase();
  const product = await database.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, featured: true },
  });

  if (!product) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  if (product.status === "ARCHIVED") {
    return { status: "success", message: t("admin.success.postHidden") };
  }

  if (product.status !== "PUBLISHED") {
    return { status: "error", message: t("admin.errors.notPublished") };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, status: "PUBLISHED" },
    data: { status: "ARCHIVED", archivedAt: new Date(), featured: false },
  });

  if (updated.count !== 1) {
    return { status: "error", message: t("admin.errors.objectChanged") };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "PRODUCT_ARCHIVED",
      targetType: "product",
      targetId: product.id,
      metadata: { reason: "admin-hide" },
    }),
  );

  logger.info("product.hidden", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  redirect("/admin/posts?hidden=1");
}

export async function restoreAdminProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/posts");
  const { t } = await getServerI18n();
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  const database = getDatabase();
  const product = await database.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true },
  });

  if (!product) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  if (product.status !== "ARCHIVED") {
    return { status: "error", message: t("admin.errors.notHidden") };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, status: "ARCHIVED" },
    data: { status: "PUBLISHED", publishedAt: new Date(), archivedAt: null, reviewedAt: new Date(), reviewedById: actor.id },
  });

  if (updated.count !== 1) {
    return { status: "error", message: t("admin.errors.objectChanged") };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "PRODUCT_PUBLISHED",
      targetType: "product",
      targetId: product.id,
      metadata: { reason: "admin-restore" },
    }),
  );

  logger.info("product.restored", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  redirect("/admin/posts?restored=1");
}

export async function deleteAdminProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const actor = await requireAdmin("/admin/posts");
  const { t } = await getServerI18n();
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  const database = getDatabase();
  const product = await database.product.findUnique({
    where: { id: productId },
    select: { id: true, status: true, images: { select: { storageKey: true } } },
  });

  if (!product) {
    return { status: "error", message: t("admin.errors.objectGone") };
  }

  if (product.status === "PUBLISHED" || product.status === "PENDING_REVIEW") {
    return { status: "error", message: t("admin.errors.deletePublishedForbidden") };
  }

  const deleted = await database.product.deleteMany({
    where: { id: product.id, status: product.status },
  });

  if (deleted.count !== 1) {
    return { status: "error", message: t("admin.errors.objectChanged") };
  }

  const storage = getStorage();
  await Promise.all(
    product.images.map((image) =>
      storage.delete(image.storageKey).catch((error: unknown) => {
        logger.warn("product.image_delete_failed", { productId: product.id, error });
      }),
    ),
  );

  logger.info("product.deleted", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  redirect("/admin/posts?deleted=1");
}
