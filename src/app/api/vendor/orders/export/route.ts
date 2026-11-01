import { NextResponse } from "next/server";
import { z } from "zod";

import { parseSearchTerm } from "@/features/admin/filters";
import { ORDER_STATUS_LABELS } from "@/features/checkout/status";
import { decimalToCents, formatMoney } from "@/features/catalog/money";
import { requireApprovedVendor } from "@/server/auth/guards";
import { buildCsv } from "@/server/export/csv";
import { getDatabase } from "@/server/db/client";

const statuses = Object.keys(ORDER_STATUS_LABELS) as (keyof typeof ORDER_STATUS_LABELS)[];
const querySchema = z.object({ status: z.enum(statuses).optional() });

export async function GET(request: Request) {
  const { vendorId } = await requireApprovedVendor("/vendor/orders");
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  }

  const search = parseSearchTerm(url.searchParams.get("q") ?? undefined);
  const orders = await getDatabase().vendorOrder.findMany({
    where: {
      vendorId,
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(search
        ? {
            OR: [
              { order: { orderNumber: { contains: search, mode: "insensitive" as const } } },
              {
                items: {
                  some: { productName: { contains: search, mode: "insensitive" as const } },
                },
              },
              { items: { some: { sku: { contains: search, mode: "insensitive" as const } } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      status: true,
      subtotal: true,
      currency: true,
      createdAt: true,
      order: { select: { orderNumber: true } },
      items: { select: { productName: true, sku: true, quantity: true } },
    },
  });

  const csv = buildCsv(
    ["Order", "Status", "Product", "SKU", "Quantity", "Subtotal", "Currency", "Created at"],
    orders.flatMap((order) =>
      order.items.map((item) => [
        order.order.orderNumber,
        ORDER_STATUS_LABELS[order.status],
        item.productName,
        item.sku,
        item.quantity,
        formatMoney(decimalToCents(order.subtotal), order.currency),
        order.currency,
        order.createdAt.toISOString(),
      ]),
    ),
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supplyhub-vendor-orders.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
