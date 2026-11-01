import "server-only";

import { getDatabase } from "@/server/db/client";
import type { VendorStatus } from "@/generated/prisma/enums";

const vendorSummarySelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  monogram: true,
  location: true,
  discipline: true,
  story: true,
  status: true,
  reviewNote: true,
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

export async function listVendorApplications() {
  const applications = await getDatabase().vendor.findMany({
    select: {
      ...vendorSummarySelect,
      owner: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const statusOrder: Record<VendorStatus, number> = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
    SUSPENDED: 3,
  };

  return applications.sort((left, right) => {
    const statusDifference = statusOrder[left.status] - statusOrder[right.status];
    return statusDifference !== 0
      ? statusDifference
      : right.createdAt.getTime() - left.createdAt.getTime();
  });
}
