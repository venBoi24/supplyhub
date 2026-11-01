import "server-only";

import { connection } from "next/server";

import { getDatabase } from "@/server/db/client";

export async function listVendorOrders(vendorId: string) {
  await connection();
  return getDatabase().vendorOrder.findMany({
    where: { vendorId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      currency: true,
      subtotal: true,
      createdAt: true,
      order: { select: { orderNumber: true, recipientName: true } },
      items: { select: { productName: true, sku: true, quantity: true } },
    },
  });
}
