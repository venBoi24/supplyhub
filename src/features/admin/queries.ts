import "server-only";

import { connection } from "next/server";

import type { AuditAction, OrderStatus, UserRole, UserStatus } from "@/generated/prisma/enums";
import { getDatabase } from "@/server/db/client";

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
  const [users, vendors, products, orders, paidOrders, pendingApplications] = await Promise.all([
    database.user.count(),
    database.vendor.count({ where: { status: "APPROVED" } }),
    database.product.count({ where: { status: "PUBLISHED" } }),
    database.order.count(),
    database.order.count({
      where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
    }),
    database.vendor.count({ where: { status: "PENDING" } }),
  ]);
  return { users, vendors, products, orders, paidOrders, pendingApplications };
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
