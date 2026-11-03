import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import { centsToDecimalString, decimalToCents } from "@/features/catalog/money";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { logger } from "@/lib/logging/logger";

import { MAX_CART_QUANTITY } from "@/features/cart/constants";
import { createOrderNumber } from "./order-number";
import type { PlacedOrder } from "./types";
import type { CheckoutAddressInput } from "./validation";

export type CheckoutErrorCode =
  "cart-empty" | "unavailable-items" | "currency-mismatch" | "invalid-request";

function haversineKm(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLatitude = toRadians(latitude2 - latitude1);
  const deltaLongitude = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

export class CheckoutError extends Error {
  constructor(
    readonly code: CheckoutErrorCode,
    message: string,
    readonly details: string[] = [],
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}

export interface PlaceOrderInput {
  customerId: string;
  cartId: string;
  address: CheckoutAddressInput;
  reservationMinutes: number;
}

const checkoutCartInclude = {
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
          vendorId: true,
          vendor: { select: { id: true, status: true, latitude: true, longitude: true } },
          category: { select: { status: true } },
          images: {
            where: { status: "APPROVED" },
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { storageKey: true },
          },
        },
      },
    },
  },
} as const satisfies Prisma.CartInclude;

type CheckoutCart = Prisma.CartGetPayload<{ include: typeof checkoutCartInclude }>;

function isOrderNumberCollision(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    String(error.meta?.target ?? "").includes("order_number")
  );
}

/**
 * Creates the parent order, one vendor order per studio, and immutable item snapshots in a
 * single transaction. Stock is decremented with a conditional update so concurrent checkouts
 * cannot oversell; any failure rolls the whole order back.
 */
export async function placeOrder(
  database: PrismaClient,
  input: PlaceOrderInput,
): Promise<PlacedOrder> {
  if (!Number.isInteger(input.reservationMinutes) || input.reservationMinutes <= 0) {
    throw new CheckoutError("invalid-request", "The reservation window is not configured.");
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await runCheckout(database, input);
    } catch (error) {
      if (attempt < 2 && isOrderNumberCollision(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new CheckoutError("invalid-request", "The order could not be placed. Try again.");
}

async function runCheckout(database: PrismaClient, input: PlaceOrderInput): Promise<PlacedOrder> {
  const now = new Date();
  const reservationExpiresAt = new Date(now.getTime() + input.reservationMinutes * 60_000);

  return database.$transaction(async (transaction) => {
    // Lock the cart row so two concurrent submissions cannot both consume the same lines.
    const locked = await transaction.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "carts"
      WHERE "id" = ${input.cartId}::uuid AND "user_id" = ${input.customerId}::uuid
      FOR UPDATE
    `;

    if (locked.length === 0) {
      throw new CheckoutError("cart-empty", "Your cart could not be found. Add an object first.");
    }

    const cart: CheckoutCart | null = await transaction.cart.findUnique({
      where: { id: input.cartId },
      include: checkoutCartInclude,
    });

    if (!cart || cart.items.length === 0) {
      throw new CheckoutError("cart-empty", "Your cart is empty.");
    }

    const currency = cart.items[0]?.product.currency;

    if (!currency) {
      throw new CheckoutError("cart-empty", "Your cart is empty.");
    }

    const vendorCoordinates = new Map<
      string,
      { latitude: Prisma.Decimal | null; longitude: Prisma.Decimal | null }
    >();

    const problems: string[] = [];

    for (const item of cart.items) {
      const product = item.product;

      if (
        product.status !== "PUBLISHED" ||
        product.vendor.status !== "APPROVED" ||
        product.category.status !== "ACTIVE"
      ) {
        problems.push(`${product.name} is no longer available.`);
        continue;
      }

      if (product.currency !== currency) {
        problems.push(`${product.name} is priced in ${product.currency}, not ${currency}.`);
        continue;
      }

      if (item.quantity > product.stock) {
        problems.push(
          product.stock === 0
            ? `${product.name} is sold out.`
            : `${product.name}: only ${product.stock} left.`,
        );
        continue;
      }

      if (item.quantity < 1 || item.quantity > MAX_CART_QUANTITY) {
        problems.push(`${product.name} has an invalid quantity.`);
      }
    }

    if (problems.length > 0) {
      throw new CheckoutError(
        "unavailable-items",
        "Some objects in your cart need attention before checkout.",
        problems,
      );
    }

    if (cart.items.some((item) => item.product.currency !== currency)) {
      throw new CheckoutError(
        "currency-mismatch",
        "Objects priced in different currencies cannot be ordered together.",
      );
    }

    const orderNumber = createOrderNumber(now);

    const groups = new Map<
      string,
      {
        vendorId: string;
        subtotalCents: number;
        items: {
          productId: string;
          productName: string;
          productSlug: string;
          sku: string;
          imageKey: string | null;
          unitPriceCents: number;
          quantity: number;
          lineTotalCents: number;
        }[];
      }
    >();

    let subtotalCents = 0;
    let itemCount = 0;

    for (const item of cart.items) {
      const product = item.product;
      if (!vendorCoordinates.has(product.vendorId)) {
        vendorCoordinates.set(product.vendorId, {
          latitude: product.vendor.latitude,
          longitude: product.vendor.longitude,
        });
      }
      const unitPriceCents = decimalToCents(product.price);
      const lineTotalCents = unitPriceCents * item.quantity;
      const snapshot = {
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        sku: product.sku,
        imageKey: product.images[0]?.storageKey ?? null,
        unitPriceCents,
        quantity: item.quantity,
        lineTotalCents,
      };

      const group = groups.get(product.vendorId) ?? {
        vendorId: product.vendorId,
        subtotalCents: 0,
        items: [],
      };

      group.items.push(snapshot);
      group.subtotalCents += lineTotalCents;
      groups.set(product.vendorId, group);

      subtotalCents += lineTotalCents;
      itemCount += item.quantity;
    }

    const deliveryMethod = input.address.deliveryMethod ?? "PICKUP";
    const deliveryRatePerKmCents = Math.max(
      0,
      Number(process.env.DELIVERY_RATE_PER_KM_CENTS ?? 20000),
    );
    const deliveryMinimumFeeCents = Math.max(
      0,
      Number(process.env.DELIVERY_MIN_FEE_CENTS ?? 50000),
    );

    let shippingCents = 0;
    let deliveryDistanceKm: number | null = null;

    if (deliveryMethod === "DELIVERY") {
      const customerLatitude = input.address.customerLatitude;
      const customerLongitude = input.address.customerLongitude;

      if (customerLatitude === undefined || customerLongitude === undefined) {
        throw new CheckoutError(
          "invalid-request",
          "Use your location to calculate delivery distance and price.",
        );
      }

      let totalDistance = 0;

      for (const group of groups.values()) {
        const coordinates = vendorCoordinates.get(group.vendorId);

        if (!coordinates || coordinates.latitude === null || coordinates.longitude === null) {
          throw new CheckoutError(
            "unavailable-items",
            "Delivery is not available for one of the studios in your cart.",
          );
        }

        const distanceKm = haversineKm(
          customerLatitude,
          customerLongitude,
          Number(coordinates.latitude),
          Number(coordinates.longitude),
        );

        totalDistance += distanceKm;
        shippingCents += Math.max(
          deliveryMinimumFeeCents,
          Math.round(distanceKm * deliveryRatePerKmCents),
        );
      }

      deliveryDistanceKm = totalDistance;
    }

    const totalCents = subtotalCents + shippingCents;

    const order = await transaction.order.create({
      data: {
        orderNumber,
        customerId: input.customerId,
        status: "AWAITING_PAYMENT",
        currency,
        subtotal: centsToDecimalString(subtotalCents),
        shippingTotal: centsToDecimalString(shippingCents),
        taxTotal: "0.00",
        discountTotal: "0.00",
        total: centsToDecimalString(totalCents),
        recipientName: input.address.recipientName,
        contactEmail: input.address.contactEmail,
        contactPhone: input.address.contactPhone ?? null,
        addressLine1: input.address.addressLine1,
        addressLine2: input.address.addressLine2 ?? null,
        city: input.address.city,
        region: input.address.region,
        postalCode: input.address.postalCode,
        countryCode: input.address.countryCode,
        deliveryMethod,
        deliveryDistanceKm: deliveryDistanceKm === null ? null : deliveryDistanceKm.toFixed(3),
        customerLatitude:
          input.address.customerLatitude === undefined
            ? null
            : input.address.customerLatitude.toFixed(7),
        customerLongitude:
          input.address.customerLongitude === undefined
            ? null
            : input.address.customerLongitude.toFixed(7),
        reservationExpiresAt,
      },
      select: { id: true },
    });

    for (const group of groups.values()) {
      const vendorOrder = await transaction.vendorOrder.create({
        data: {
          orderId: order.id,
          vendorId: group.vendorId,
          status: "AWAITING_PAYMENT",
          currency,
          subtotal: centsToDecimalString(group.subtotalCents),
        },
        select: { id: true },
      });

      await transaction.orderItem.createMany({
        data: group.items.map((item) => ({
          orderId: order.id,
          vendorOrderId: vendorOrder.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          sku: item.sku,
          imageKey: item.imageKey,
          unitPrice: centsToDecimalString(item.unitPriceCents),
          quantity: item.quantity,
          lineTotal: centsToDecimalString(item.lineTotalCents),
          currency,
        })),
      });
    }

    for (const item of cart.items) {
      const updated = await transaction.product.updateMany({
        where: {
          id: item.productId,
          status: "PUBLISHED",
          stock: { gte: item.quantity },
          vendor: { status: "APPROVED" },
          category: { status: "ACTIVE" },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (updated.count !== 1) {
        throw new CheckoutError(
          "unavailable-items",
          `${item.product.name} just sold out. Review your cart and try again.`,
        );
      }

      const current = await transaction.product.findUnique({
        where: { id: item.productId },
        select: { stock: true },
      });

      await transaction.inventoryMovement.create({
        data: {
          productId: item.productId,
          actorId: input.customerId,
          delta: -item.quantity,
          reason: "SALE",
          resultingStock: current?.stock ?? 0,
          note: `Reserved by order ${orderNumber}.`,
        },
      });
    }

    await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });

    await recordAuditEvent(transaction, {
      actorId: input.customerId,
      action: "ORDER_PLACED",
      targetType: "order",
      targetId: order.id,
      metadata: { orderNumber, vendorCount: groups.size, itemCount },
    });

    logger.info("order.placed", {
      orderId: order.id,
      orderNumber,
      vendorCount: groups.size,
      itemCount,
    });

    return {
      id: order.id,
      orderNumber,
      currency,
      totalCents: subtotalCents,
      itemCount,
      vendorCount: groups.size,
      reservationExpiresAt,
    };
  });
}

/**
 * Releases stock held by unpaid orders whose reservation window has passed. Each order is
 * claimed with a conditional update before stock is returned, so concurrent sweeps cannot
 * release the same reservation twice.
 */
export async function releaseExpiredReservations(
  database: PrismaClient,
  now = new Date(),
): Promise<number> {
  const due = await database.order.findMany({
    where: {
      status: "AWAITING_PAYMENT",
      reservationExpiresAt: { lte: now },
    },
    orderBy: { reservationExpiresAt: "asc" },
    take: 50,
    select: {
      id: true,
      orderNumber: true,
      items: { select: { productId: true, quantity: true } },
    },
  });

  let released = 0;

  for (const order of due) {
    const didRelease = await database.$transaction(async (transaction) => {
      const claimed = await transaction.order.updateMany({
        where: {
          id: order.id,
          status: "AWAITING_PAYMENT",
          reservationExpiresAt: { lte: now },
        },
        data: { status: "EXPIRED", cancelledAt: now },
      });

      if (claimed.count !== 1) {
        return false;
      }

      await transaction.vendorOrder.updateMany({
        where: { orderId: order.id },
        data: { status: "EXPIRED" },
      });

      for (const item of order.items) {
        if (!item.productId) {
          continue;
        }

        const product = await transaction.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
          select: { stock: true },
        });

        await transaction.inventoryMovement.create({
          data: {
            productId: item.productId,
            actorId: null,
            delta: item.quantity,
            reason: "RELEASE",
            resultingStock: product.stock,
            note: `Reservation expired for order ${order.orderNumber}.`,
          },
        });
      }

      await recordAuditEvent(transaction, {
        actorId: null,
        action: "ORDER_EXPIRED",
        targetType: "order",
        targetId: order.id,
        metadata: { orderNumber: order.orderNumber },
      });

      return true;
    });

    if (didRelease) {
      released += 1;
      logger.info("order.reservation_expired", { orderNumber: order.orderNumber });
    }
  }

  return released;
}
