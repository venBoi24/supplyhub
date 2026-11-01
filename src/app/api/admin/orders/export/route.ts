import { NextResponse } from "next/server";
import { z } from "zod";

import { ORDER_STATUS_LABELS } from "@/features/checkout/status";
import { parseSearchTerm } from "@/features/admin/filters";
import { getDatabase } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/guards";
import { buildCsv } from "@/server/export/csv";
import { decimalToCents } from "@/features/catalog/money";
import { formatMoney } from "@/features/catalog/money";

const statuses = Object.keys(ORDER_STATUS_LABELS) as (keyof typeof ORDER_STATUS_LABELS)[];
const querySchema = z.object({ status: z.enum(statuses).optional() });

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  const search = parseSearchTerm(url.searchParams.get("q") ?? undefined);

  const orders = await getDatabase().order.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: "insensitive" as const } },
              { contactEmail: { contains: search, mode: "insensitive" as const } },
              { recipientName: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { placedAt: "desc" },
    take: 1000,
    select: {
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      placedAt: true,
      customer: { select: { name: true, email: true } },
    },
  });
  const csv = buildCsv(
    ["Order", "Status", "Customer", "Email", "Total", "Currency", "Placed at"],
    orders.map((order) => [
      order.orderNumber,
      ORDER_STATUS_LABELS[order.status],
      order.customer.name,
      order.customer.email,
      formatMoney(decimalToCents(order.total), order.currency),
      order.currency,
      order.placedAt.toISOString(),
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supplyhub-orders.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
