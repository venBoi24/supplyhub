import "server-only";

import { connection } from "next/server";

import type { ProductStatus } from "@/generated/prisma/enums";
import { getDatabase } from "@/server/db/client";
import { mediaUrlForKey } from "@/server/storage/keys";

import { decimalToCents } from "./money";
import type { CatalogImage } from "./types";

export interface StudioProductSummary {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  sku: string;
  priceCents: number;
  currency: string;
  stock: number;
  featured: boolean;
  updatedAt: Date;
  categoryName: string;
  image: CatalogImage | null;
}

export interface StudioProductDetail extends StudioProductSummary {
  categoryId: string;
  summary: string;
  description: string;
  makerNote: string;
  materials: string[];
  dimensions: string;
  care: string;
  compareAtPriceCents: number | null;
  reviewNote: string | null;
  images: Array<CatalogImage & { id: string; sortOrder: number }>;
  movements: Array<{
    id: string;
    delta: number;
    reason: string;
    resultingStock: number;
    note: string | null;
    createdAt: Date;
    actorName: string | null;
  }>;
}

function toImage(image: { id: string; storageKey: string; alt: string; sortOrder: number }) {
  return {
    id: image.id,
    src: mediaUrlForKey(image.storageKey),
    alt: image.alt,
    sortOrder: image.sortOrder,
  };
}

export async function listVendorProducts(vendorId: string): Promise<StudioProductSummary[]> {
  await connection();

  const products = await getDatabase().product.findMany({
    where: { vendorId },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      sku: true,
      price: true,
      currency: true,
      stock: true,
      featured: true,
      updatedAt: true,
      category: { select: { name: true } },
      images: {
        where: { status: "APPROVED" },
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { id: true, storageKey: true, alt: true, sortOrder: true },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
    take: 200,
  });

  return products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    sku: product.sku,
    priceCents: decimalToCents(product.price),
    currency: product.currency,
    stock: product.stock,
    featured: product.featured,
    updatedAt: product.updatedAt,
    categoryName: product.category.name,
    image: product.images[0] ? toImage(product.images[0]) : null,
  }));
}

export async function getVendorProduct(
  vendorId: string,
  productId: string,
): Promise<StudioProductDetail | null> {
  await connection();

  const product = await getDatabase().product.findFirst({
    where: { id: productId, vendorId },
    include: {
      category: { select: { name: true } },
      images: { orderBy: { sortOrder: "asc" } },
      inventoryMovements: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!product) {
    return null;
  }

  const cover = product.images.find((image) => image.status === "APPROVED");

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    status: product.status,
    sku: product.sku,
    priceCents: decimalToCents(product.price),
    compareAtPriceCents: product.compareAtPrice ? decimalToCents(product.compareAtPrice) : null,
    currency: product.currency,
    stock: product.stock,
    featured: product.featured,
    updatedAt: product.updatedAt,
    categoryId: product.categoryId,
    categoryName: product.category.name,
    image: cover ? toImage(cover) : null,
    summary: product.summary,
    description: product.description,
    makerNote: product.makerNote,
    materials: product.materials,
    dimensions: product.dimensions,
    care: product.care,
    reviewNote: product.reviewNote,
    images: product.images.map(toImage),
    movements: product.inventoryMovements.map((movement) => ({
      id: movement.id,
      delta: movement.delta,
      reason: movement.reason,
      resultingStock: movement.resultingStock,
      note: movement.note,
      createdAt: movement.createdAt,
      actorName: movement.actor?.name ?? null,
    })),
  };
}

export async function listStudioCategoryOptions(): Promise<Array<{ id: string; name: string }>> {
  await connection();

  return getDatabase().category.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function getStudioProductStats(vendorId: string): Promise<{
  total: number;
  published: number;
  pendingReview: number;
  lowStock: number;
}> {
  await connection();

  const [grouped, lowStock] = await Promise.all([
    getDatabase().product.groupBy({
      by: ["status"],
      where: { vendorId },
      _count: { _all: true },
    }),
    getDatabase().product.count({
      where: { vendorId, status: "PUBLISHED", stock: { lte: 4 } },
    }),
  ]);

  const counts = new Map(grouped.map((entry) => [entry.status, entry._count._all]));

  return {
    total: grouped.reduce((total, entry) => total + entry._count._all, 0),
    published: counts.get("PUBLISHED") ?? 0,
    pendingReview: counts.get("PENDING_REVIEW") ?? 0,
    lowStock,
  };
}
