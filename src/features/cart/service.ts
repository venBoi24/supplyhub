import "server-only";

import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";

import type { Prisma } from "@/generated/prisma/client";
import { PRODUCT_IMAGE_HEIGHT, PRODUCT_IMAGE_WIDTH } from "@/features/catalog/constants";
import { decimalToCents } from "@/features/catalog/money";
import type { CatalogImage } from "@/features/catalog/types";
import { logger } from "@/lib/logging/logger";
import type { Actor } from "@/server/auth/actor";
import { getSessionActor } from "@/server/auth/session";
import { getDatabase } from "@/server/db/client";
import { mediaUrlForKey } from "@/server/storage/keys";

import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_NAME,
  GUEST_CART_TTL_DAYS,
  MAX_CART_QUANTITY,
} from "./constants";
import { createCartToken, hashCartToken, isCartToken } from "./guest-token";
import { summarizeCart } from "./pricing";
import type { CartLineDraft, CartView } from "./types";

const cartInclude = {
  items: {
    orderBy: { createdAt: "asc" },
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          name: true,
          sku: true,
          price: true,
          currency: true,
          stock: true,
          status: true,
          vendor: { select: { name: true, slug: true, status: true } },
          category: { select: { status: true } },
          images: {
            where: { status: "APPROVED" },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { storageKey: true, alt: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.CartInclude;

type CartRow = Prisma.CartGetPayload<{ include: typeof cartInclude }>;

function guestCartExpiry(now = new Date()): Date {
  return new Date(now.getTime() + GUEST_CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function isExpired(cart: { expiresAt: Date | null }): boolean {
  return cart.expiresAt !== null && cart.expiresAt.getTime() <= Date.now();
}

async function setGuestCartCookie(token: string): Promise<void> {
  (await cookies()).set(CART_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  });
}

async function clearGuestCartCookie(): Promise<void> {
  (await cookies()).delete(CART_COOKIE_NAME);
}

async function readGuestCartToken(): Promise<string | null> {
  const token = (await cookies()).get(CART_COOKIE_NAME)?.value;
  return isCartToken(token) ? token : null;
}

function mapImage(image: { storageKey: string; alt: string } | undefined): CatalogImage | null {
  if (!image) {
    return null;
  }

  return {
    src: mediaUrlForKey(image.storageKey),
    alt: image.alt,
    width: PRODUCT_IMAGE_WIDTH,
    height: PRODUCT_IMAGE_HEIGHT,
  };
}

function toDrafts(cart: CartRow): CartLineDraft[] {
  return cart.items.map((item) => {
    const product = item.product;
    const purchasable =
      product.status === "PUBLISHED" &&
      product.vendor.status === "APPROVED" &&
      product.category.status === "ACTIVE";

    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      sku: product.sku,
      vendorName: product.vendor.name,
      vendorSlug: product.vendor.slug,
      image: mapImage(product.images[0]),
      unitPriceCents: decimalToCents(product.price),
      currency: product.currency,
      quantity: item.quantity,
      stock: product.stock,
      purchasable,
    };
  });
}

export async function getCartView(): Promise<CartView> {
  await connection();

  const actor = await getSessionActor();
  const database = getDatabase();
  let cart: CartRow | null = null;

  if (actor) {
    cart = await database.cart.findUnique({
      where: { userId: actor.id },
      include: cartInclude,
    });
  } else {
    const token = await readGuestCartToken();

    if (token) {
      cart = await database.cart.findUnique({
        where: { guestTokenHash: hashCartToken(token) },
        include: cartInclude,
      });

      if (cart && isExpired(cart)) {
        cart = null;
      }
    }
  }

  return cart ? summarizeCart(toDrafts(cart)) : summarizeCart([]);
}

export const getCartItemCount = cache(async (): Promise<number> => {
  await connection();

  const actor = await getSessionActor();
  const database = getDatabase();
  let cartId: string | null = null;

  if (actor) {
    const cart = await database.cart.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
    cartId = cart?.id ?? null;
  } else {
    const token = await readGuestCartToken();

    if (token) {
      const cart = await database.cart.findUnique({
        where: { guestTokenHash: hashCartToken(token) },
        select: { id: true, expiresAt: true },
      });

      if (cart && !isExpired(cart)) {
        cartId = cart.id;
      }
    }
  }

  if (!cartId) {
    return 0;
  }

  const aggregate = await database.cartItem.aggregate({
    where: { cartId },
    _sum: { quantity: true },
  });

  return aggregate._sum.quantity ?? 0;
});

/**
 * Resolves the existing cart for the signed-in user or guest cookie without creating one.
 * Used by read paths and by mutations that must not silently create an empty cart.
 */
export async function findCurrentCart(): Promise<{ id: string } | null> {
  const actor = await getSessionActor();
  const database = getDatabase();

  if (actor) {
    return database.cart.findUnique({
      where: { userId: actor.id },
      select: { id: true },
    });
  }

  const token = await readGuestCartToken();

  if (!token) {
    return null;
  }

  const cart = await database.cart.findUnique({
    where: { guestTokenHash: hashCartToken(token) },
    select: { id: true, expiresAt: true },
  });

  return cart && !isExpired(cart) ? { id: cart.id } : null;
}

/**
 * Resolves the cart that a mutation should write to, creating one when needed. Guest tokens
 * are generated here rather than during rendering because cookies can only be written from
 * server actions or route handlers.
 */
export async function getOrCreateCartForMutation(): Promise<{
  cartId: string;
  actor: Actor | null;
}> {
  const actor = await getSessionActor();
  const database = getDatabase();

  if (actor) {
    const cart = await database.cart.upsert({
      where: { userId: actor.id },
      update: {},
      create: { userId: actor.id },
      select: { id: true },
    });

    return { cartId: cart.id, actor };
  }

  const existingToken = await readGuestCartToken();
  const token = existingToken ?? createCartToken();
  const tokenHash = hashCartToken(token);

  const existing = await database.cart.findUnique({
    where: { guestTokenHash: tokenHash },
    select: { id: true, expiresAt: true },
  });

  if (existing && !isExpired(existing)) {
    await database.cart.update({
      where: { id: existing.id },
      data: { expiresAt: guestCartExpiry() },
    });
    await setGuestCartCookie(token);
    return { cartId: existing.id, actor };
  }

  if (existing) {
    await database.cart.delete({ where: { id: existing.id } });
  }

  const cart = await database.cart.create({
    data: { guestTokenHash: tokenHash, expiresAt: guestCartExpiry() },
    select: { id: true },
  });

  await setGuestCartCookie(token);
  return { cartId: cart.id, actor };
}

export async function touchCart(cartId: string): Promise<void> {
  await getDatabase().cart.update({
    where: { id: cartId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Folds a guest cart into the signed-in cart, keeping the higher resulting quantity per
 * object. Runs after a successful sign-in or sign-up, while cookies can still be written.
 */
export async function mergeGuestCartIntoUserCart(userId: string): Promise<void> {
  const token = await readGuestCartToken();

  if (!token) {
    return;
  }

  const database = getDatabase();
  const guest = await database.cart.findUnique({
    where: { guestTokenHash: hashCartToken(token) },
    include: { items: { select: { productId: true, quantity: true } } },
  });

  if (!guest) {
    await clearGuestCartCookie();
    return;
  }

  if (isExpired(guest)) {
    await database.cart.delete({ where: { id: guest.id } });
    await clearGuestCartCookie();
    return;
  }

  try {
    await database.$transaction(async (transaction) => {
      const userCart = await transaction.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
        select: { id: true },
      });

      for (const item of guest.items) {
        await transaction.$executeRaw`
          INSERT INTO "cart_items" ("id", "cart_id", "product_id", "quantity", "created_at", "updated_at")
          VALUES (${randomUUID()}::uuid, ${userCart.id}::uuid, ${item.productId}::uuid, ${item.quantity}, now(), now())
          ON CONFLICT ("cart_id", "product_id")
          DO UPDATE SET
            "quantity" = LEAST("cart_items"."quantity" + EXCLUDED."quantity", ${MAX_CART_QUANTITY}),
            "updated_at" = now()
        `;
      }

      await transaction.cart.delete({ where: { id: guest.id } });
    });
  } catch (error) {
    logger.warn("cart.merge_failed", { userId, error });
    return;
  }

  await clearGuestCartCookie();
}
