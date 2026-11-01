import "server-only";

import { connection } from "next/server";

import type { Prisma } from "@/generated/prisma/client";
import { initialsFor } from "@/lib/utils/initials";
import { getDatabase } from "@/server/db/client";
import { mediaUrlForKey } from "@/server/storage/keys";

import { getAvailability } from "./availability";
import { PRODUCT_IMAGE_HEIGHT, PRODUCT_IMAGE_WIDTH } from "./constants";
import { decimalToCents } from "./money";
import { searchTokens } from "./search";
import {
  PRODUCTS_PER_PAGE,
  type CatalogFilters,
  type CatalogImage,
  type Category,
  type CategorySummary,
  type ProductListing,
  type ProductPage,
  type ProductSort,
  type Vendor,
  type VendorSummary,
} from "./types";

const FALLBACK_IMAGE: CatalogImage = {
  src: "/images/demo/placeholder.jpg",
  alt: "",
  width: PRODUCT_IMAGE_WIDTH,
  height: PRODUCT_IMAGE_HEIGHT,
};

const publicProductWhere = {
  status: "PUBLISHED",
  vendor: { status: "APPROVED" },
  category: { status: "ACTIVE" },
} as const satisfies Prisma.ProductWhereInput;

const productInclude = {
  vendor: true,
  category: true,
  images: {
    where: { status: "APPROVED" },
    orderBy: { sortOrder: "asc" },
  },
} as const satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const productOrderBy: Record<ProductSort, Prisma.ProductOrderByWithRelationInput[]> = {
  featured: [{ featured: "desc" }, { publishedAt: "desc" }, { name: "asc" }, { id: "asc" }],
  newest: [{ publishedAt: "desc" }, { name: "asc" }, { id: "asc" }],
  "price-asc": [{ price: "asc" }, { name: "asc" }, { id: "asc" }],
  "price-desc": [{ price: "desc" }, { name: "asc" }, { id: "asc" }],
};

function mapVendor(vendor: {
  name: string;
  slug: string;
  monogram: string | null;
  location: string | null;
  city: string | null;
  street: string | null;
  address: string | null;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
  discipline: string | null;
  story: string | null;
  description: string | null;
}): Vendor {
  return {
    slug: vendor.slug,
    name: vendor.name,
    monogram: vendor.monogram?.trim() || initialsFor(vendor.name),
    location:
      vendor.location?.trim() ||
      [vendor.address, vendor.street, vendor.city].filter(Boolean).join(", ") ||
      "Independent studio",
    latitude: vendor.latitude?.toNumber() ?? null,
    longitude: vendor.longitude?.toNumber() ?? null,
    discipline: vendor.discipline?.trim() || "Independent studio",
    story: vendor.story?.trim() || vendor.description?.trim() || "",
  };
}

function mapCategory(category: {
  name: string;
  slug: string;
  headline: string;
  description: string;
}): Category {
  return {
    slug: category.slug,
    name: category.name,
    headline: category.headline,
    description: category.description,
  };
}

function mapImage(image: { storageKey: string; alt: string }): CatalogImage {
  return {
    src: mediaUrlForKey(image.storageKey),
    alt: image.alt,
    width: PRODUCT_IMAGE_WIDTH,
    height: PRODUCT_IMAGE_HEIGHT,
  };
}

function mapProduct(row: ProductRow): ProductListing {
  const images = row.images.map(mapImage);
  const image = images[0] ?? FALLBACK_IMAGE;
  const vendor = mapVendor(row.vendor);
  const category = mapCategory(row.category);
  const addedAt = row.publishedAt ?? row.createdAt;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    vendorSlug: row.vendor.slug,
    categorySlug: row.category.slug,
    priceCents: decimalToCents(row.price),
    compareAtPriceCents: row.compareAtPrice ? decimalToCents(row.compareAtPrice) : undefined,
    currency: row.currency,
    summary: row.summary,
    description: row.description,
    makerNote: row.makerNote,
    materials: row.materials,
    dimensions: row.dimensions,
    care: row.care,
    inventory: row.stock,
    image,
    images,
    featured: row.featured,
    addedAt: addedAt.toISOString().slice(0, 10),
    vendor,
    category,
    availability: getAvailability(row.stock),
  };
}

function buildSearchFilter(query: string): Prisma.ProductWhereInput {
  const tokens = searchTokens(query);

  if (tokens.length === 0) {
    return {};
  }

  return {
    AND: tokens.map((token) => ({
      OR: [
        { searchText: { contains: token } },
        { vendor: { name: { contains: token, mode: "insensitive" as const } } },
        { vendor: { location: { contains: token, mode: "insensitive" as const } } },
        { vendor: { discipline: { contains: token, mode: "insensitive" as const } } },
        { category: { name: { contains: token, mode: "insensitive" as const } } },
      ],
    })),
  };
}

export async function listProductPage(filters: CatalogFilters = {}): Promise<ProductPage> {
  await connection();

  const perPage = Math.min(Math.max(Math.trunc(filters.limit ?? PRODUCTS_PER_PAGE) || 1, 1), 48);
  const requestedPage = Math.max(Math.trunc(filters.page ?? 1) || 1, 1);

  const where: Prisma.ProductWhereInput = { ...publicProductWhere };

  if (filters.category) {
    where.category = { status: "ACTIVE", slug: filters.category };
  }

  if (filters.vendor) {
    where.vendor = { status: "APPROVED", slug: filters.vendor };
  }

  if (filters.query) {
    Object.assign(where, buildSearchFilter(filters.query));
  }

  const database = getDatabase();
  const total = await database.product.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / perPage));
  const page = Math.min(requestedPage, pageCount);

  const rows =
    total === 0
      ? []
      : await database.product.findMany({
          where,
          include: productInclude,
          orderBy: productOrderBy[filters.sort ?? "featured"],
          skip: (page - 1) * perPage,
          take: perPage,
        });

  return {
    items: rows.map(mapProduct),
    total,
    page,
    pageCount,
    perPage,
  };
}

export async function listProducts(filters: CatalogFilters = {}): Promise<ProductListing[]> {
  const result = await listProductPage(filters);
  return [...result.items];
}

export async function getProductBySlug(slug: string): Promise<ProductListing | undefined> {
  if (!slug || slug.length > 72) {
    return undefined;
  }

  await connection();

  const row = await getDatabase().product.findFirst({
    where: { ...publicProductWhere, slug },
    include: productInclude,
  });

  return row ? mapProduct(row) : undefined;
}

export async function getFeaturedProducts(limit = 4): Promise<ProductListing[]> {
  return listProducts({ sort: "featured", limit });
}

export async function getRelatedProducts(slug: string, limit = 3): Promise<ProductListing[]> {
  await connection();

  const database = getDatabase();
  const current = await database.product.findFirst({
    where: { ...publicProductWhere, slug },
    select: { id: true, categoryId: true, vendorId: true },
  });

  if (!current) {
    return [];
  }

  const rows = await database.product.findMany({
    where: {
      ...publicProductWhere,
      id: { not: current.id },
      OR: [{ categoryId: current.categoryId }, { vendorId: current.vendorId }],
    },
    include: productInclude,
    orderBy: productOrderBy.featured,
    take: Math.min(Math.max(limit * 4, 12), 24),
  });

  return rows
    .sort(
      (left, right) =>
        Number(right.categoryId === current.categoryId) -
          Number(left.categoryId === current.categoryId) ||
        Number(right.featured) - Number(left.featured) ||
        (right.publishedAt?.getTime() ?? 0) - (left.publishedAt?.getTime() ?? 0),
    )
    .slice(0, limit)
    .map(mapProduct);
}

export async function listVendorSummaries(): Promise<VendorSummary[]> {
  await connection();

  const vendors = await getDatabase().vendor.findMany({
    where: { status: "APPROVED" },
    select: {
      name: true,
      slug: true,
      monogram: true,
      location: true,
      city: true,
      street: true,
      address: true,
      latitude: true,
      longitude: true,
      discipline: true,
      story: true,
      description: true,
      _count: {
        select: {
          products: {
            where: { status: "PUBLISHED", category: { status: "ACTIVE" } },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return vendors.map((vendor) => ({
    ...mapVendor(vendor),
    productCount: vendor._count.products,
  }));
}

export async function getVendorBySlug(slug: string): Promise<VendorSummary | undefined> {
  if (!slug || slug.length > 72) {
    return undefined;
  }

  const vendors = await listVendorSummaries();
  return vendors.find((vendor) => vendor.slug === slug);
}

export async function listCategorySummaries(): Promise<CategorySummary[]> {
  await connection();

  const categories = await getDatabase().category.findMany({
    where: { status: "ACTIVE" },
    select: {
      name: true,
      slug: true,
      headline: true,
      description: true,
      _count: {
        select: {
          products: {
            where: { status: "PUBLISHED", vendor: { status: "APPROVED" } },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return categories.map((category) => ({
    ...mapCategory(category),
    productCount: category._count.products,
  }));
}

export async function getCategoryBySlug(slug: string): Promise<CategorySummary | undefined> {
  if (!slug || slug.length > 72) {
    return undefined;
  }

  const categories = await listCategorySummaries();
  return categories.find((category) => category.slug === slug);
}

export async function getCatalogStats(): Promise<{
  products: number;
  vendors: number;
  categories: number;
}> {
  await connection();

  const database = getDatabase();
  const [products, vendors, categories] = await Promise.all([
    database.product.count({ where: publicProductWhere }),
    database.vendor.count({ where: { status: "APPROVED" } }),
    database.category.count({ where: { status: "ACTIVE" } }),
  ]);

  return { products, vendors, categories };
}
