import "server-only";

import { connection } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { decimalToCents } from "@/features/catalog/money";
import { logger } from "@/lib/logging/logger";
import type { Actor } from "@/server/auth/actor";
import { canViewCustomerOrder } from "@/server/auth/policies";
import { getDatabase } from "@/server/db/client";
import { mediaUrlForKey } from "@/server/storage/keys";

import { ORDER_NUMBER_PATTERN } from "./order-number";
import { releaseExpiredReservations } from "./service";
import type {
  CustomerOrderDetail,
  CustomerOrderSummary,
  OrderItemView,
  VendorOrderView,
} from "./types";

const orderDetailInclude = {
  vendorOrders: {
    orderBy: { createdAt: "asc" },
    include: {
      vendor: { select: { name: true, slug: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  },
} as const satisfies Prisma.OrderInclude;

type OrderDetailRow = Prisma.OrderGetPayload<{ include: typeof orderDetailInclude }>;

function mapItem(item: OrderDetailRow["vendorOrders"][number]["items"][number]): OrderItemView {
  return {
    id: item.id,
    productName: item.productName,
    productSlug: item.productSlug,
    sku: item.sku,
    imageSrc: item.imageKey ? mediaUrlForKey(item.imageKey) : null,
    unitPriceCents: decimalToCents(item.unitPrice),
    quantity: item.quantity,
    lineTotalCents: decimalToCents(item.lineTotal),
    currency: item.currency,
  };
}

function mapVendorOrder(
  vendorOrder: OrderDetailRow["vendorOrders"][number],
): VendorOrderView {
  return {
    id: vendorOrder.id,
    vendorName: vendorOrder.vendor.name,
    vendorSlug: vendorOrder.vendor.slug,
    status: vendorOrder.status,
    subtotalCents: decimalToCents(vendorOrder.subtotal),
    items: vendorOrder.items.map(mapItem),
  };
}

function mapDetail(row: OrderDetailRow): CustomerOrderDetail {
  return {
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    subtotalCents: decimalToCents(row.subtotal),
    shippingTotalCents: decimalToCents(row.shippingTotal),
    taxTotalCents: decimalToCents(row.taxTotal),
    discountTotalCents: decimalToCents(row.discountTotal),
    totalCents: decimalToCents(row.total),
    placedAt: row.placedAt,
    reservationExpiresAt: row.reservationExpiresAt,
    address: {
      recipientName: row.recipientName,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      addressLine1: row.addressLine1,
      addressLine2: row.addressLine2,
      city: row.city,
      region: row.region,
      postalCode: row.postalCode,
      countryCode: row.countryCode,
    },
    vendorOrders: row.vendorOrders.map(mapVendorOrder),
  };
}

async function sweepExpiredReservations(): Promise<void> {
  try {
    await releaseExpiredReservations(getDatabase());
  } catch (error) {
    logger.warn("order.reservation_sweep_failed", { error });
  }
}

export async function listCustomerOrders(customerId: string): Promise<CustomerOrderSummary[]> {
  await connection();
  await sweepExpiredReservations();

  const rows = await getDatabase().order.findMany({
    where: { customerId },
    orderBy: { placedAt: "desc" },
    take: 50,
    select: {
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      placedAt: true,
      items: { select: { quantity: true } },
      vendorOrders: { select: { vendor: { select: { name: true } } } },
    },
  });

  return rows.map((row) => ({
    orderNumber: row.orderNumber,
    status: row.status,
    totalCents: decimalToCents(row.total),
    itemCount: row.items.reduce((total, item) => total + item.quantity, 0),
    currency: row.currency,
    placedAt: row.placedAt,
    vendorNames: row.vendorOrders.map((vendorOrder) => vendorOrder.vendor.name),
  }));
}

export async function getOrderForViewer(
  actor: Actor,
  orderNumber: string,
): Promise<CustomerOrderDetail | null> {
  if (!ORDER_NUMBER_PATTERN.test(orderNumber)) {
    return null;
  }

  await connection();
  await sweepExpiredReservations();

  const row = await getDatabase().order.findUnique({
    where: { orderNumber },
    include: orderDetailInclude,
  });

  if (!row || !canViewCustomerOrder(actor, row.customerId)) {
    return null;
  }

  return mapDetail(row);
}
