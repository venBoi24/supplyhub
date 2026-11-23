"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { firstFieldErrors, formValue, type FormState } from "@/features/identity/form-state";
import { getServerI18n } from "@/i18n/server";
import type { Translator } from "@/i18n/dictionary";
import { logger } from "@/lib/logging/logger";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";

import { MAX_CART_QUANTITY } from "./constants";
import { findCurrentCart, getOrCreateCartForMutation, touchCart } from "./service";
import { createCartMutationSchema, createCartProductIdSchema } from "./validation";

function revalidateCart(): void {
  revalidatePath("/", "layout");
}

/**
 * Reads the session and returns a localized error state for suspended accounts.
 * Takes the request translator because `getServerI18n()` is request-scoped and
 * must not be awaited at module scope.
 */
async function rejectInactiveActor(t: Translator): Promise<FormState | null> {
  const actor = await getSessionActor();

  if (actor && actor.status !== "ACTIVE") {
    return { status: "error", message: t("cart.errors.accountInactive") };
  }

  return null;
}

export async function addToCartAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const inactive = await rejectInactiveActor(t);

  if (inactive) {
    return inactive;
  }

  const parsed = createCartMutationSchema(t).safeParse({
    productId: formValue(formData, "productId"),
    quantity: formValue(formData, "quantity"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const database = getDatabase();
  const product = await database.product.findFirst({
    where: {
      id: parsed.data.productId,
      status: "PUBLISHED",
      vendor: { status: "APPROVED" },
      category: { status: "ACTIVE" },
    },
    select: { id: true, stock: true },
  });

  if (!product) {
    return { status: "error", message: t("cart.errors.objectUnavailable") };
  }

  if (product.stock <= 0) {
    return { status: "error", message: t("cart.errors.soldOut") };
  }

  const { cartId } = await getOrCreateCartForMutation();
  const existing = await database.cartItem.findUnique({
    where: { cartId_productId: { cartId, productId: product.id } },
    select: { quantity: true },
  });

  if ((existing?.quantity ?? 0) + parsed.data.quantity > product.stock) {
    return {
      status: "error",
      message:
        product.stock === 1
          ? t("cart.errors.onlyOneAvailable")
          : t("cart.errors.onlyN", { count: product.stock }),
    };
  }

  await database.$executeRaw`
    INSERT INTO "cart_items" ("id", "cart_id", "product_id", "quantity", "created_at", "updated_at")
    VALUES (${randomUUID()}::uuid, ${cartId}::uuid, ${product.id}::uuid, ${parsed.data.quantity}, now(), now())
    ON CONFLICT ("cart_id", "product_id")
    DO UPDATE SET
      "quantity" = LEAST(
        "cart_items"."quantity" + EXCLUDED."quantity",
        ${MAX_CART_QUANTITY},
        ${product.stock}
      ),
      "updated_at" = now()
  `;
  await touchCart(cartId);

  logger.info("cart.item_added", { productId: product.id, quantity: parsed.data.quantity });
  revalidateCart();

  return { status: "success", message: t("cart.success.added") };
}

export async function updateCartLineAction(
  _previousState: FormState,
  formData: FormData,
): Promise<FormState> {
  const { t } = await getServerI18n();
  const inactive = await rejectInactiveActor(t);

  if (inactive) {
    return inactive;
  }

  const parsed = createCartMutationSchema(t).safeParse({
    productId: formValue(formData, "productId"),
    quantity: formValue(formData, "quantity"),
  });

  if (!parsed.success) {
    return { status: "error", fieldErrors: firstFieldErrors(parsed.error) };
  }

  const cart = await findCurrentCart();

  if (!cart) {
    return { status: "error", message: t("cart.errors.notInCart") };
  }

  const database = getDatabase();
  const line = await database.cartItem.findUnique({
    where: { cartId_productId: { cartId: cart.id, productId: parsed.data.productId } },
    select: { id: true, product: { select: { name: true, stock: true } } },
  });

  if (!line) {
    return { status: "error", message: t("cart.errors.notInCart") };
  }

  if (parsed.data.quantity > line.product.stock) {
    return {
      status: "error",
      message:
        line.product.stock === 0
          ? t("cart.errors.namedSoldOut", { name: line.product.name })
          : t("cart.errors.namedOnlyN", { count: line.product.stock, name: line.product.name }),
    };
  }

  await database.cartItem.update({
    where: { id: line.id },
    data: { quantity: parsed.data.quantity },
  });
  await touchCart(cart.id);

  revalidateCart();
  return { status: "success", message: t("cart.quantityUpdated") };
}

export async function removeCartLineAction(formData: FormData): Promise<void> {
  const { t } = await getServerI18n();
  if (await rejectInactiveActor(t)) {
    redirect("/cart?inactive=1");
  }

  const productId = createCartProductIdSchema(t).safeParse(formValue(formData, "productId"));

  if (!productId.success) {
    redirect("/cart");
  }

  const cart = await findCurrentCart();

  if (cart) {
    await getDatabase().cartItem.deleteMany({
      where: { cartId: cart.id, productId: productId.data },
    });
    await touchCart(cart.id);
  }

  revalidateCart();
  redirect("/cart?removed=1");
}

export async function clearCartAction(): Promise<void> {
  const { t } = await getServerI18n();
  if (await rejectInactiveActor(t)) {
    redirect("/cart?inactive=1");
  }

  const cart = await findCurrentCart();

  if (cart) {
    await getDatabase().cartItem.deleteMany({ where: { cartId: cart.id } });
    await touchCart(cart.id);
  }

  revalidateCart();
  redirect("/cart?cleared=1");
}
