import "server-only";

import { connection } from "next/server";

import { getDatabase } from "@/server/db/client";
import type { VendorStatus } from "@/generated/prisma/enums";
import { DEFAULT_PAGE_SIZE, clampPage, pageOffset } from "@/lib/utils/pagination";

const vendorSummarySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  monogram: true,
  location: true,
  city: true,
  street: true,
  address: true,
  latitude: true,
  longitude: true,
  discipline: true,
  contactPhone: true,
  departments: { select: { categoryId: true, category: { select: { name: true } } } },
  story: true,
  status: true,
  reviewNote: true,
  appealReason: true,
  appealedAt: true,
  appealReviewedAt: true,
  appealReviewNote: true,
  reviewedAt: true,
  createdAt: true,
} as const;

export async function getVendorForOwner(userId: string) {
  return getDatabase().vendor.findUnique({
    where: { ownerId: userId },
    select: vendorSummarySelect,
  });
}

export async function getVendorById(vendorId: string) {
  return getDatabase().vendor.findUnique({
    where: { id: vendorId },
    select: {
      ...vendorSummarySelect,
      owner: { select: { id: true, name: true, email: true, role: true } },
    },
  });
}

export async function listVendorApplications(input: {
  page: number;
  status?: VendorStatus;
  search?: string;
}) {
  await connection();
  const database = getDatabase();
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { slug: { contains: input.search, mode: "insensitive" as const } },
            { owner: { name: { contains: input.search, mode: "insensitive" as const } } },
            { owner: { email: { contains: input.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [total, grouped] = await Promise.all([
    database.vendor.count({ where }),
    database.vendor.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const page = clampPage(input.page, total);
  const applications = await database.vendor.findMany({
    where,
    select: {
      ...vendorSummarySelect,
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    skip: pageOffset(page),
    take: DEFAULT_PAGE_SIZE,
  });
  const counts: Record<VendorStatus, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    SUSPENDED: 0,
  };
  for (const entry of grouped) counts[entry.status] = entry._count._all;
  return { applications, counts, total, page };
}
