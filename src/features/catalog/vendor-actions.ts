"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logging/logger";
import { initialsFor } from "@/lib/utils/initials";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { canPerformAdminAction } from "@/server/auth/policies";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { MAX_IMAGE_BYTES, validateImageUpload } from "@/server/storage/image-validation";
import { getStorage } from "@/server/storage/object-storage";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";

import { DEFAULT_CURRENCY, MAX_PRODUCT_IMAGES } from "./constants";
import { applyStockAdjustment } from "./inventory";
import { centsToDecimalString } from "./money";
import { buildSearchText } from "./search";
import {
  imageAltSchema,
  inventoryAdjustmentSchema,
  productInputSchema,
  studioProfileSchema,
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

function uniqueFieldErrors(error: unknown): FormState {
  const target = isUniqueConstraintError(error)
    ? String((error as Prisma.PrismaClientKnownRequestError).meta?.target ?? "")
    : "";

  if (target.includes("sku")) {
    return {
      status: "error",
      fieldErrors: { sku: "Another object in your studio already uses that SKU." },
    };
  }

  if (target.includes("slug")) {
    return {
      status: "error",
      fieldErrors: { slug: "That handle is already in use. Choose another one." },
    };
  }

  return { status: "error", message: "That change conflicts with an existing record." };
}

async function requireStudio() {
  const actor = await getSessionActor();

  if (!actor) {
    redirect("/sign-in?next=%2Fvendor");
  }

  if (actor.role === "ADMIN") {
    redirect("/admin/products");
  }

  if (actor.role !== "VENDOR" || !actor.vendor || actor.vendor.status !== "APPROVED") {
    redirect("/vendor");
  }

  return { actor, vendorId: actor.vendor.id };
}

async function requireManagedStudio(formData: FormData) {
  const requestedVendorId = formValue(formData, "adminVendorId");
  if (requestedVendorId) {
    const actor = await getSessionActor();
    const vendorId = asUuid(requestedVendorId);
    if (!actor || !canPerformAdminAction(actor) || !vendorId) {
      return null;
    }
    const vendor = await getDatabase().vendor.findUnique({
      where: { id: vendorId },
      select: { id: true },
    });
    return vendor ? { actor, vendorId, adminManaged: true as const } : null;
  }
  const access = await requireStudio();
  return { ...access, adminManaged: false as const };
}

function productFields(input: ReturnType<typeof productInputSchema.parse>) {
  const summary = input.description.slice(0, 277).trimEnd();
  return {
    name: input.name,
    slug: input.slug,
    categoryId: input.categoryId,
    sku: input.sku,
    price: centsToDecimalString(input.priceCents),
    compareAtPrice: null,
    currency: DEFAULT_CURRENCY,
    summary: summary.length < input.description.length ? `${summary}…` : summary,
    description: input.description,
    makerNote: input.makerNote,
    materials: input.materials,
    dimensions: "",
    care: "",
    searchText: buildSearchText(input),
  };
}

export async function saveProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId, adminManaged } = access;
  const rawProductId = formValue(formData, "productId");
  const productId = rawProductId ? asUuid(rawProductId) : null;

  if (rawProductId && !productId) {
    return { status: "error", message: "That object reference is invalid." };
  }

  const parsed = productInputSchema.safeParse({
    name: formValue(formData, "name"),
    slug: formValue(formData, "slug"),
    categoryId: formValue(formData, "categoryId"),
    sku: `SH-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
    priceCents: formValue(formData, "price"),
    compareAtPriceCents: "",
    summary: formValue(formData, "description").slice(0, 280),
    description: formValue(formData, "description"),
    makerNote: formValue(formData, "makerNote"),
    materials: formValue(formData, "materials"),
    dimensions: "",
    care: "",
    initialStock: formValue(formData, "initialStock"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const upload = formData.get("image");
  const altResult = imageAltSchema.safeParse(formValue(formData, "alt"));
  let imagePayload: {
    bytes: Uint8Array;
    contentType: string;
    byteSize: number;
    alt: string;
  } | null = null;
  if (!productId) {
    if (!(upload instanceof File) || upload.size === 0) {
      return { status: "error", fieldErrors: { image: "Choose a cover photo." } };
    }
    if (upload.size > MAX_IMAGE_BYTES) {
      return { status: "error", fieldErrors: { image: "Images must be 5 MB or smaller." } };
    }
    if (!altResult.success) {
      return {
        status: "error",
        fieldErrors: { alt: altResult.error.issues[0]?.message ?? "Describe the image." },
      };
    }
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const validation = validateImageUpload({
      bytes,
      declaredType: upload.type,
      declaredSize: upload.size,
    });
    if (!validation.ok) {
      return { status: "error", fieldErrors: { image: validation.error } };
    }
    imagePayload = {
      bytes,
      contentType: validation.image.contentType,
      byteSize: validation.image.byteSize,
      alt: altResult.data,
    };
  }

  const database = getDatabase();
  const category = await database.category.findFirst({
    where: { id: parsed.data.categoryId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!category) {
    return {
      status: "error",
      fieldErrors: { categoryId: "Choose an active department." },
    };
  }

  const data = productFields(parsed.data);
  const hasLocation = ["city", "street", "address"].some((key) => formValue(formData, key));
  const location = hasLocation
    ? z
        .object({
          city: z.string().trim().min(2).max(80),
          street: z.string().trim().min(2).max(120),
          address: z.string().trim().min(2).max(160),
          latitude: z.preprocess(
            (value) => (value === "" ? null : Number(value)),
            z.number().min(-90).max(90).nullable(),
          ),
          longitude: z.preprocess(
            (value) => (value === "" ? null : Number(value)),
            z.number().min(-180).max(180).nullable(),
          ),
        })
        .safeParse({
          city: formValue(formData, "city"),
          street: formValue(formData, "street"),
          address: formValue(formData, "address"),
          latitude: formValue(formData, "latitude"),
          longitude: formValue(formData, "longitude"),
        })
    : null;

  if (location && !location.success) {
    return {
      status: "error",
      message: "Enter a valid city, street, and address for the studio location.",
    };
  }

  try {
    if (!productId) {
      const createdProductId = randomUUID();
      const storageKey = `products/${createdProductId}/${randomUUID()}.${imagePayload?.contentType === "image/jpeg" ? "jpg" : imagePayload?.contentType === "image/png" ? "png" : "webp"}`;
      try {
        if (!imagePayload) return { status: "error", message: "Choose a cover photo." };
        await getStorage().put(storageKey, imagePayload.bytes, imagePayload.contentType);
      } catch {
        return { status: "error", message: "The photo could not be uploaded. Please try again." };
      }
      const created = await database
        .$transaction(async (transaction) => {
          const product = await transaction.product.create({
            data: {
              id: createdProductId,
              ...data,
              vendorId,
              stock: parsed.data.initialStock,
              status: "DRAFT",
            },
            select: { id: true },
          });

          if (location?.success) {
            await transaction.vendor.update({
              where: { id: vendorId },
              data: {
                city: location.data.city,
                street: location.data.street,
                address: location.data.address,
                location: [location.data.address, location.data.street, location.data.city].join(
                  ", ",
                ),
                latitude: location.data.latitude?.toFixed(7) ?? null,
                longitude: location.data.longitude?.toFixed(7) ?? null,
              },
            });
          }

          await transaction.productImage.create({
            data: {
              productId: product.id,
              storageKey,
              alt: imagePayload.alt,
              contentType: imagePayload.contentType,
              byteSize: imagePayload.byteSize,
              sortOrder: 0,
              status: "APPROVED",
            },
          });

          if (parsed.data.initialStock > 0) {
            await transaction.inventoryMovement.create({
              data: {
                productId: product.id,
                actorId: actor.id,
                delta: parsed.data.initialStock,
                reason: "INITIAL",
                resultingStock: parsed.data.initialStock,
                note: "Initial stock recorded when the object was created.",
              },
            });
          }

          await recordAuditEvent(transaction, {
            actorId: actor.id,
            action: "PRODUCT_CREATED",
            targetType: "product",
            targetId: product.id,
            metadata: { slug: product.id, status: "DRAFT" },
          });

          return product;
        })
        .catch(async (error: unknown) => {
          await getStorage()
            .delete(storageKey)
            .catch(() => undefined);
          throw error;
        });

      logger.info("product.created", { actorId: actor.id, productId: created.id });
      revalidateCatalog();
      if (adminManaged) {
        return { status: "success", message: "Product draft created for this vendor." };
      }
      redirect(`/vendor/products/${created.id}?saved=1`);
    }

    const existing = await database.product.findFirst({
      where: { id: productId, vendorId },
      select: { id: true, status: true },
    });

    if (!existing) {
      return { status: "error", message: "That object could not be found in your studio." };
    }

    if (existing.status === "PENDING_REVIEW") {
      return {
        status: "error",
        message: "This object is waiting for review. Stock can still be adjusted below.",
      };
    }

    if (existing.status === "ARCHIVED") {
      return { status: "error", message: "Archived objects cannot be edited." };
    }

    const update: Prisma.ProductUpdateManyMutationInput = { ...data };

    if (existing.status === "REJECTED") {
      update.status = "DRAFT";
      update.reviewNote = null;
    }

    const updated = await database.product.updateMany({
      where: { id: existing.id, vendorId },
      data: update,
    });

    if (updated.count !== 1) {
      return {
        status: "error",
        message: "That object changed while you were editing. Reload and retry.",
      };
    }

    logger.info("product.updated", { actorId: actor.id, productId: existing.id });
    revalidateCatalog();
    if (adminManaged) return { status: "success", message: "Product details saved." };
    redirect(`/vendor/products/${existing.id}?saved=1`);
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return uniqueFieldErrors(error);
    }

    throw error;
  }
}

export async function submitProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId, adminManaged } = access;
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: "That object reference is invalid." };
  }

  const database = getDatabase();
  const product = await database.product.findFirst({
    where: { id: productId, vendorId },
    select: {
      id: true,
      status: true,
      category: { select: { status: true } },
      _count: { select: { images: { where: { status: "APPROVED" } } } },
    },
  });

  if (!product) {
    return { status: "error", message: "That object could not be found in your studio." };
  }

  if (product.status !== "DRAFT" && product.status !== "REJECTED") {
    return { status: "error", message: "Only drafts or rejected objects can be submitted." };
  }

  if (product.category.status !== "ACTIVE") {
    return { status: "error", message: "Choose an active department before submitting." };
  }

  if (product._count.images === 0) {
    return { status: "error", message: "Add at least one image before submitting for review." };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, vendorId, status: product.status },
    data: {
      status: "PENDING_REVIEW",
      submittedAt: new Date(),
      reviewNote: null,
      reviewedAt: null,
      reviewedById: null,
    },
  });

  if (updated.count !== 1) {
    return { status: "error", message: "That object already changed status. Reload and retry." };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "PRODUCT_SUBMITTED",
      targetType: "product",
      targetId: product.id,
      metadata: { previousStatus: product.status, newStatus: "PENDING_REVIEW" },
    }),
  );

  logger.info("product.submitted", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  if (adminManaged) return { status: "success", message: "Product sent for review." };
  redirect("/vendor?sent=1");
}

export async function archiveProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId, adminManaged } = access;
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: "That object reference is invalid." };
  }

  const database = getDatabase();
  const product = await database.product.findFirst({
    where: { id: productId, vendorId },
    select: { id: true, status: true },
  });

  if (!product) {
    return { status: "error", message: "That object could not be found in your studio." };
  }

  if (product.status === "ARCHIVED") {
    return { status: "success", message: "This object is already archived." };
  }

  const updated = await database.product.updateMany({
    where: { id: product.id, vendorId, status: product.status },
    data: { status: "ARCHIVED", archivedAt: new Date(), featured: false },
  });

  if (updated.count !== 1) {
    return { status: "error", message: "That object already changed status. Reload and retry." };
  }

  await database.$transaction((transaction) =>
    recordAuditEvent(transaction, {
      actorId: actor.id,
      action: "PRODUCT_ARCHIVED",
      targetType: "product",
      targetId: product.id,
      metadata: { previousStatus: product.status, newStatus: "ARCHIVED" },
    }),
  );

  logger.info("product.archived", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  if (adminManaged) return { status: "success", message: "Product archived." };
  redirect("/vendor?archived=1");
}

export async function deleteProductAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId, adminManaged } = access;
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: "That object reference is invalid." };
  }

  const database = getDatabase();
  const product = await database.product.findFirst({
    where: { id: productId, vendorId },
    select: {
      id: true,
      status: true,
      images: { select: { storageKey: true } },
    },
  });

  if (!product) {
    return { status: "error", message: "That object could not be found in your studio." };
  }

  if (product.status !== "DRAFT" && product.status !== "REJECTED") {
    return {
      status: "error",
      message: "Only unpublished drafts or rejected objects can be deleted. Archive it instead.",
    };
  }

  const deleted = await database.product.deleteMany({
    where: { id: product.id, vendorId, status: product.status },
  });

  if (deleted.count !== 1) {
    return { status: "error", message: "That object already changed status. Reload and retry." };
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
  if (adminManaged) return { status: "success", message: "Product draft deleted." };
  redirect("/vendor?deleted=1");
}

export async function updateStudioProfileAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { actor, vendorId } = await requireStudio();

  const parsed = studioProfileSchema.safeParse({
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

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();
  const activeDepartments = await database.category.count({
    where: { id: { in: parsed.data.departmentIds }, status: "ACTIVE" },
  });
  if (activeDepartments !== new Set(parsed.data.departmentIds).size) {
    return {
      status: "error",
      fieldErrors: { departmentIds: "Choose active departments from the list." },
    };
  }

  await database.$transaction(async (transaction) => {
    await transaction.vendor.update({
      where: { id: vendorId },
      data: {
        location: [parsed.data.address, parsed.data.street, parsed.data.city].join(", "),
        city: parsed.data.city,
        street: parsed.data.street,
        address: parsed.data.address,
        latitude: parsed.data.latitude?.toFixed(7) ?? null,
        longitude: parsed.data.longitude?.toFixed(7) ?? null,
        discipline: parsed.data.discipline,
        contactPhone: parsed.data.contactPhone,
        story: parsed.data.story,
        monogram: parsed.data.monogram || initialsFor(actor.name),
        departments: {
          deleteMany: {},
          create: parsed.data.departmentIds.map((categoryId) => ({ categoryId })),
        },
      },
    });
  });

  logger.info("vendor.profile_updated", { actorId: actor.id, vendorId });
  revalidateCatalog();
  redirect("/vendor/profile?saved=1");
}

export async function adjustInventoryAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId } = access;

  const parsed = inventoryAdjustmentSchema.safeParse({
    productId: formValue(formData, "productId"),
    mode: formValue(formData, "mode"),
    quantity: formValue(formData, "quantity"),
    reason: formValue(formData, "reason"),
    note: formValue(formData, "note"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();

  try {
    const message = await database.$transaction(async (transaction) => {
      const product = await transaction.product.findFirst({
        where: { id: parsed.data.productId, vendorId },
        select: { id: true, stock: true, status: true },
      });

      if (!product) {
        throw new StockChangeError("That object could not be found in your studio.");
      }

      if (product.status === "ARCHIVED") {
        throw new StockChangeError("Archived objects cannot change stock.");
      }

      const result = applyStockAdjustment(product.stock, {
        mode: parsed.data.mode,
        quantity: parsed.data.quantity,
      });

      if (!result.ok) {
        throw new StockChangeError(result.error);
      }

      const updated = await transaction.product.updateMany({
        where: { id: product.id, vendorId, stock: product.stock },
        data: { stock: result.nextStock },
      });

      if (updated.count !== 1) {
        throw new StockChangeError(
          "Stock changed while you were editing. Reload the page and try again.",
        );
      }

      await transaction.inventoryMovement.create({
        data: {
          productId: product.id,
          actorId: actor.id,
          delta: result.delta,
          reason: parsed.data.reason,
          resultingStock: result.nextStock,
          note: parsed.data.note || null,
        },
      });

      return `Stock updated from ${result.previousStock} to ${result.nextStock}.`;
    });

    logger.info("inventory.adjusted", {
      actorId: actor.id,
      productId: parsed.data.productId,
      reason: parsed.data.reason,
    });
    revalidateCatalog();
    return { status: "success", message };
  } catch (error) {
    if (error instanceof StockChangeError) {
      return { status: "error", message: error.message };
    }

    throw error;
  }
}

class StockChangeError extends Error {}

export async function uploadProductImageAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId } = access;
  const productId = asUuid(formValue(formData, "productId"));

  if (!productId) {
    return { status: "error", message: "That object reference is invalid." };
  }

  const alt = imageAltSchema.safeParse(formValue(formData, "alt"));

  if (!alt.success) {
    return { status: "error", fieldErrors: firstFieldErrors(alt.error) };
  }

  const file = formData.get("image");

  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", fieldErrors: { image: "Choose an image file." } };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { status: "error", fieldErrors: { image: "Images must be 5 MB or smaller." } };
  }

  const database = getDatabase();
  const product = await database.product.findFirst({
    where: { id: productId, vendorId },
    select: {
      id: true,
      status: true,
      _count: { select: { images: true } },
    },
  });

  if (!product) {
    return { status: "error", message: "That object could not be found in your studio." };
  }

  if (product.status === "PENDING_REVIEW") {
    return { status: "error", message: "Wait for the review before changing images." };
  }

  if (product.status === "ARCHIVED") {
    return { status: "error", message: "Archived objects cannot change images." };
  }

  if (product._count.images >= MAX_PRODUCT_IMAGES) {
    return {
      status: "error",
      fieldErrors: { image: `Each object can have ${MAX_PRODUCT_IMAGES} images.` },
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateImageUpload({
    bytes,
    declaredType: file.type,
    declaredSize: file.size,
  });

  if (!validation.ok) {
    return { status: "error", fieldErrors: { image: validation.error } };
  }

  const key = `products/${product.id}/${randomUUID()}.${validation.image.extension}`;
  const storage = getStorage();

  await storage.put(key, bytes, validation.image.contentType);

  try {
    const highest = await database.productImage.aggregate({
      where: { productId: product.id },
      _max: { sortOrder: true },
    });

    await database.productImage.create({
      data: {
        productId: product.id,
        storageKey: key,
        alt: alt.data,
        contentType: validation.image.contentType,
        byteSize: validation.image.byteSize,
        sortOrder: (highest._max.sortOrder ?? -1) + 1,
        status: "APPROVED",
      },
    });
  } catch (error) {
    await storage.delete(key).catch(() => undefined);
    throw error;
  }

  logger.info("product.image_uploaded", { actorId: actor.id, productId: product.id });
  revalidateCatalog();
  return { status: "success", message: "Image uploaded." };
}

export async function deleteProductImageAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { actor, vendorId } = access;
  const imageId = asUuid(formValue(formData, "imageId"));

  if (!imageId) {
    return { status: "error", message: "That image reference is invalid." };
  }

  const database = getDatabase();
  const image = await database.productImage.findFirst({
    where: { id: imageId, product: { vendorId } },
    select: {
      id: true,
      storageKey: true,
      productId: true,
      product: {
        select: {
          status: true,
          _count: { select: { images: true } },
        },
      },
    },
  });

  if (!image) {
    return { status: "error", message: "That image could not be found in your studio." };
  }

  if (image.product.status === "PENDING_REVIEW") {
    return { status: "error", message: "Wait for the review before changing images." };
  }

  if (image.product.status === "PUBLISHED" && image.product._count.images <= 1) {
    return {
      status: "error",
      message: "A published object needs at least one image. Archive it or add another first.",
    };
  }

  const deleted = await database.productImage.deleteMany({
    where: { id: image.id, product: { vendorId } },
  });

  if (deleted.count !== 1) {
    return { status: "error", message: "That image already changed. Reload and retry." };
  }

  await getStorage()
    .delete(image.storageKey)
    .catch((error: unknown) => {
      logger.warn("product.image_delete_failed", { productId: image.productId, error });
    });

  logger.info("product.image_deleted", { actorId: actor.id, productId: image.productId });
  revalidateCatalog();
  return { status: "success", message: "Image removed." };
}

export async function moveProductImageAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await requireManagedStudio(formData);
  if (!access) return { status: "error", message: "Administrator access is required." };
  const { vendorId } = access;
  const imageId = asUuid(formValue(formData, "imageId"));
  const direction = formValue(formData, "direction");

  if (!imageId || (direction !== "up" && direction !== "down")) {
    return { status: "error", message: "That image reference is invalid." };
  }

  const database = getDatabase();
  const image = await database.productImage.findFirst({
    where: { id: imageId, product: { vendorId } },
    select: { id: true, productId: true, product: { select: { status: true } } },
  });

  if (!image) {
    return { status: "error", message: "That image could not be found in your studio." };
  }

  if (image.product.status === "PENDING_REVIEW" || image.product.status === "ARCHIVED") {
    return { status: "error", message: "Images cannot be reordered right now." };
  }

  const images = await database.productImage.findMany({
    where: { productId: image.productId },
    select: { id: true, sortOrder: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  const index = images.findIndex((item) => item.id === image.id);
  const neighbourIndex = direction === "up" ? index - 1 : index + 1;
  const current = images[index];
  const neighbour = images[neighbourIndex];

  if (!current || !neighbour) {
    return { status: "success", message: "Image order unchanged." };
  }

  await database.$transaction([
    database.productImage.update({
      where: { id: current.id },
      data: { sortOrder: neighbour.sortOrder },
    }),
    database.productImage.update({
      where: { id: neighbour.id },
      data: { sortOrder: current.sortOrder },
    }),
  ]);

  revalidateCatalog();
  return { status: "success", message: "Image order updated." };
}
