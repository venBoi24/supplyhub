import "server-only";

import { connection } from "next/server";

import type { AuditAction, OrderStatus, UserRole, UserStatus } from "@/generated/prisma/enums";
import { getDatabase } from "@/server/db/client";

import { decimalToCents } from "@/features/catalog/money";
import { clampPage, DEFAULT_PAGE_SIZE, pageOffset } from "@/lib/utils/pagination";

export async function listAdminOrders(input: {
  page: number;
  status?: OrderStatus;
  search?: string;
}) {
  await connection();
  const where = {
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { orderNumber: { contains: input.search, mode: "insensitive" as const } },
            { contactEmail: { contains: input.search, mode: "insensitive" as const } },
            { recipientName: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const database = getDatabase();
  const total = await database.order.count({ where });
  const page = clampPage(input.page, total);
  const orders = await database.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    skip: pageOffset(page),
    take: DEFAULT_PAGE_SIZE,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      currency: true,
      placedAt: true,
      customer: { select: { name: true, email: true } },
      vendorOrders: { select: { vendor: { select: { name: true } }, status: true } },
    },
  });
  return { total, orders, page };
}

export async function listAdminUsers(input: {
  page: number;
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}) {
  await connection();
  const where = {
    ...(input.role ? { role: input.role } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
  const database = getDatabase();
  const total = await database.user.count({ where });
  const page = clampPage(input.page, total);
  const users = await database.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageOffset(page),
    take: DEFAULT_PAGE_SIZE,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      emailVerifiedAt: true,
      createdAt: true,
      vendor: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          location: true,
          discipline: true,
          story: true,
          appealReason: true,
          appealedAt: true,
          appealReviewedAt: true,
        },
      },
    },
  });
  return { total, users, page };
}

export async function getAdminDashboardMetrics() {
  await connection();
  const database = getDatabase();
  const [users, vendors, products, orders, paidOrders, pendingApplications, salesAggregate] =
    await Promise.all([
      database.user.count(),
      database.vendor.count({ where: { status: "APPROVED" } }),
      database.product.count({ where: { status: "PUBLISHED" } }),
      database.order.count(),
      database.order.count({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
      }),
      database.vendor.count({ where: { status: "PENDING" } }),
      database.order.aggregate({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        _sum: { total: true },
      }),
    ]);
  return {
    users,
    vendors,
    products,
    orders,
    paidOrders,
    pendingApplications,
    totalSalesCents: salesAggregate._sum.total ? decimalToCents(salesAggregate._sum.total) : 0,
  };
}

export async function getAdminOrderStatusCounts() {
  await connection();
  const database = getDatabase();
  const grouped = await database.order.groupBy({
    by: ["status"],
    _count: { _all: true },
    _sum: { total: true },
  });
  const statuses = [
    "AWAITING_PAYMENT",
    "PAID",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
    "EXPIRED",
  ] as const;
  return statuses.map((status) => {
    const entry = grouped.find((item) => item.status === status);
    return {
      status,
      count: entry?._count._all ?? 0,
      totalCents: entry?._sum.total ? decimalToCents(entry._sum.total) : 0,
    };
  });
}

export async function getAdminRecentRevenue(days = 7) {
  await connection();
  const database = getDatabase();
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);
  const orders = await database.order.findMany({
    where: {
      placedAt: { gte: since },
      status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
    },
    select: { placedAt: true, total: true },
  });

  const buckets = new Map<string, { label: string; cents: number }>();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = date.toISOString().slice(0, 10);
    buckets.set(key, {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cents: 0,
    });
  }

  for (const order of orders) {
    const key = order.placedAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) {
      bucket.cents += decimalToCents(order.total);
    }
  }

  return [...buckets.values()];
}

export async function listAdminRecentVendors(limit = 5) {
  await connection();
  const database = getDatabase();
  return database.vendor.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      location: true,
      createdAt: true,
    },
  });
}

export async function listAdminAuditEvents(input: { page: number; action?: AuditAction }) {
  await connection();
  const database = getDatabase();
  const where = input.action ? { action: input.action } : undefined;
  const total = await database.auditLog.count({ where });
  const page = clampPage(input.page, total);
  const events = await database.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: pageOffset(page),
    take: DEFAULT_PAGE_SIZE,
    select: {
      id: true,
      action: true,
      targetType: true,
      targetId: true,
      metadata: true,
      createdAt: true,
      actor: { select: { name: true, email: true } },
    },
  });
  return { total, events, page };
}
