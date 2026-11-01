import { NextResponse } from "next/server";
import { z } from "zod";

import { decimalToCents, formatMoney } from "@/features/catalog/money";
import { parseSearchTerm } from "@/features/admin/filters";
import { getDatabase } from "@/server/db/client";
import { requireAdmin } from "@/server/auth/guards";
import { buildCsv } from "@/server/export/csv";

const querySchema = z.object({
  status: z.enum(["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "ARCHIVED"]).optional(),
});

export async function GET(request: Request) {
  await requireAdmin();
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ status: url.searchParams.get("status") ?? undefined });
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  const search = parseSearchTerm(url.searchParams.get("q") ?? undefined);
  const products = await getDatabase().product.findMany({
    where: {
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
              { vendor: { name: { contains: search, mode: "insensitive" } } },
              { category: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 1000,
    select: {
      name: true,
      sku: true,
      status: true,
      price: true,
      currency: true,
      stock: true,
      featured: true,
      updatedAt: true,
      vendor: { select: { name: true } },
      category: { select: { name: true } },
    },
  });
  const csv = buildCsv(
    [
      "Product",
      "SKU",
      "Status",
      "Vendor",
      "Category",
      "Price",
      "Currency",
      "Stock",
      "Featured",
      "Updated at",
    ],
    products.map((product) => [
      product.name,
      product.sku,
      product.status,
      product.vendor.name,
      product.category.name,
      formatMoney(decimalToCents(product.price), product.currency),
      product.currency,
      product.stock,
      product.featured ? "Yes" : "No",
      product.updatedAt.toISOString(),
    ]),
  );
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="supplyhub-products.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}
