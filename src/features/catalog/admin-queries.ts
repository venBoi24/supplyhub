import "server-only";

import { connection } from "next/server";

import type { CategoryStatus, ProductStatus } from "@/generated/prisma/enums";
import { getDatabase } from "@/server/db/client";
import { mediaUrlForKey } from "@/server/storage/keys";

import { decimalToCents } from "./money";
import type { CatalogImage } from "./types";

export interface AdminProductSummary {
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
  vendorName: string;
  vendorSlug: string;
  categoryName: string;
  categorySlug: string;
  reviewNote: string | null;
  images: CatalogImage[];
}

export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
  headline: string;
  description: string;
  status: CategoryStatus;
  sortOrder: number;
  productCount: number;
  publishedCount: number;
}

const statusOrder: Record<ProductStatus, number> = {
  PENDING_REVIEW: 0,
  REJECTED: 1,
  DRAFT: 2,
  PUBLISHED: 3,
  ARCHIVED: 4,
};

export async function listAdminProducts(status?: ProductStatus): Promise<AdminProductSummary[]> {
  await connection();

  const products = await getDatabase().product.findMany({
    where: status ? { status } : undefined,
    include: {
      vendor: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return products
    .sort(
      (left, right) =>
        statusOrder[left.status] - statusOrder[right.status] ||
        right.updatedAt.getTime() - left.updatedAt.getTime(),
    )
    .map((product) => ({
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
      vendorName: product.vendor.name,
      vendorSlug: product.vendor.slug,
      categoryName: product.category.name,
      categorySlug: product.category.slug,
      reviewNote: product.reviewNote,
      images: product.images.map((image) => ({
        src: mediaUrlForKey(image.storageKey),
        alt: image.alt,
      })),
    }));
}

export async function getAdminProductCounts(): Promise<Record<ProductStatus, number>> {
  await connection();

  const grouped = await getDatabase().product.groupBy({
    by: ["status"],
    _count: { _all: true },
  });

  const counts: Record<ProductStatus, number> = {
    DRAFT: 0,
    PENDING_REVIEW: 0,
    PUBLISHED: 0,
    REJECTED: 0,
    ARCHIVED: 0,
  };

  for (const entry of grouped) {
    counts[entry.status] = entry._count._all;
  }

  return counts;
}

export async function listAdminCategories(): Promise<AdminCategorySummary[]> {
  await connection();

  const categories = await getDatabase().category.findMany({
    include: {
      _count: {
        select: {
          products: true,
        },
      },
      products: {
        where: { status: "PUBLISHED" },
        select: { id: true },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    headline: category.headline,
    description: category.description,
    status: category.status,
    sortOrder: category.sortOrder,
    productCount: category._count.products,
    publishedCount: category.products.length,
  }));
}

export async function getAdminCategory(id: string): Promise<AdminCategorySummary | null> {
  await connection();

  const category = await getDatabase().category.findUnique({
    where: { id },
    include: {
      _count: { select: { products: true } },
      products: { where: { status: "PUBLISHED" }, select: { id: true } },
    },
  });

  if (!category) {
    return null;
  }

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    headline: category.headline,
    description: category.description,
    status: category.status,
    sortOrder: category.sortOrder,
    productCount: category._count.products,
    publishedCount: category.products.length,
  };
}
