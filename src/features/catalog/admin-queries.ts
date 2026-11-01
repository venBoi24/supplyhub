import "server-only";

import { connection } from "next/server";

import type { CategoryStatus, ProductStatus } from "@/generated/prisma/enums";
import { clampPage, DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/utils/pagination";
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

export async function listAdminProducts(input: {
  status?: ProductStatus;
  search?: string;
  page: number;
}): Promise<{ products: AdminProductSummary[]; total: number; page: number }> {
  await connection();
  const database = getDatabase();
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { sku: { contains: input.search, mode: "insensitive" as const } },
            { vendor: { name: { contains: input.search, mode: "insensitive" as const } } },
            { category: { name: { contains: input.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const total = await database.product.count({ where });
  const page = clampPage(input.page, total);
  const products = await database.product.findMany({
    where,
    include: {
      vendor: { select: { name: true, slug: true } },
      category: { select: { name: true, slug: true } },
      images: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
    skip: pageOffset(page),
    take: DEFAULT_PAGE_SIZE,
  });

  return {
    total,
    page,
    products: products.map((product) => ({
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
    })),
  };
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
