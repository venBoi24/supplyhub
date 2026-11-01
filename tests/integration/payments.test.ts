// @vitest-environment node

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";

import { decimalToCents } from "@/features/catalog/money";
import { PrismaClient } from "@/generated/prisma/client";
import { recordAndApplyPaymentEvent } from "@/features/payments/events";
import {
  applyProviderPayment,
  createPayout,
  getVendorBalance,
  markPayoutPaid,
  reconcilePayout,
  refundPayment,
  startPayment,
} from "@/features/payments/service";
import type { GatewayPayment, PaymentGateway } from "@/server/payments/types";

const connectionString = process.env.TEST_DATABASE_URL;

interface GatewayScript {
  status: GatewayPayment["status"];
  amountMinor: number;
  currency?: string;
  feeMinor?: number;
  netMinor?: number;
}

function fakeGateway(script: GatewayScript): PaymentGateway {
  return {
    provider: "LYNXPAY",
    async createPayment(request) {
      return {
        providerPaymentId: `pay_${randomUUID()}`,
        externalId: request.externalId,
        amountMinor: script.amountMinor,
        feeMinor: script.feeMinor ?? 0,
        netMinor: script.netMinor ?? request.amountMinor,
        currency: script.currency ?? request.currency,
        status: script.status,
        paymentMethod: request.method,
        customerPhone: request.phone ?? null,
        providerReference: `ref_${randomUUID()}`,
        checkoutUrl: "https://sandbox.lynxpay.africa/checkout/test",
        failureReason: null,
        completedAt: null,
      };
    },
    async getPayment(providerPaymentId) {
      throw new Error(`Unexpected lookup for ${providerPaymentId}`);
    },
    async refundPayment() {
      return { providerRefundId: `refund_${randomUUID()}`, status: "succeeded" };
    },
  };
}

describe.runIf(Boolean(connectionString))("payments against PostgreSQL", () => {
  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
    log: ["error"],
  });

  const suffix = randomUUID().slice(0, 8);
  const orderIds: string[] = [];
  const providerIds: string[] = [];
  const vendorIds: string[] = [];
  const userIds: string[] = [];

  async function createUser(role: "CUSTOMER" | "VENDOR") {
    const user = await database.user.create({
      data: {
        email: `payments-${role.toLowerCase()}-${randomUUID()}@example.com`,
        name: `Payments ${role}`,
        role,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function createVendor() {
    const ownerId = await createUser("VENDOR");
    const vendor = await database.vendor.create({
      data: {
        ownerId,
        name: `Payments Studio ${suffix}`,
        slug: `payments-studio-${randomUUID()}`,
        status: "APPROVED",
      },
      select: { id: true },
    });
    vendorIds.push(vendor.id);
    return vendor.id;
  }

  async function createOrder(vendorId: string, totalCents: number) {
    const customerId = await createUser("CUSTOMER");
    const total = (totalCents / 100).toFixed(2);
    const order = await database.order.create({
      data: {
        orderNumber: `SH-20261101-${randomUUID().replaceAll("-", "").slice(0, 6).toUpperCase()}`,
        customerId,
        currency: "TZS",
        subtotal: total,
        total,
        recipientName: "Payment Tester",
        contactEmail: "payment-tester@example.com",
        addressLine1: "1 Ledger Lane",
        city: "Dar es Salaam",
        region: "Dar es Salaam",
        postalCode: "00000",
        countryCode: "TZ",
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        vendorOrders: {
          create: { vendorId, currency: "TZS", subtotal: total },
        },
      },
      select: { id: true, orderNumber: true, customerId: true },
    });
    orderIds.push(order.id);
    return order;
  }

  async function createPendingPayment(orderId: string, orderNumber: string, totalCents: number) {
    return database.payment.create({
      data: {
        orderId,
        attempt: 1,
        status: "PENDING",
        amount: "0.00",
        feeAmount: "0.00",
        netAmount: (totalCents / 100).toFixed(2),
        currency: "TZS",
        paymentMethod: "mpesa",
        customerPhone: "255754123456",
        idempotencyKey: `test:${orderNumber}:1`,
      },
      select: { id: true },
    });
  }

  afterAll(async () => {
    if (orderIds.length > 0) {
      await database.commissionLedger.deleteMany({ where: { orderId: { in: orderIds } } });
      await database.auditLog.deleteMany({ where: { targetId: { in: orderIds } } });
      await database.refund.deleteMany({ where: { orderId: { in: orderIds } } });
      await database.payment.deleteMany({ where: { orderId: { in: orderIds } } });
      await database.vendorOrder.deleteMany({ where: { orderId: { in: orderIds } } });
      await database.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    if (providerIds.length > 0) {
      await database.paymentEvent.deleteMany({
        where: { providerPaymentId: { in: providerIds } },
      });
    }

    if (vendorIds.length > 0) {
      await database.payout.deleteMany({ where: { vendorId: { in: vendorIds } } });
      await database.vendor.deleteMany({ where: { id: { in: vendorIds } } });
    }

    if (userIds.length > 0) {
      await database.user.deleteMany({ where: { id: { in: userIds } } });
    }

    await database.$disconnect();
  });

  it("keeps an order unpaid when the customer only starts a payment", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 185_000);
    const gateway = fakeGateway({ status: "processing", amountMinor: 185_000 });
    const started = await startPayment(database, gateway, {
      orderNumber: order.orderNumber,
      customerId: order.customerId,
      method: "mpesa",
      phone: "255754123456",
    });

    expect(started.status).toBe("PROCESSING");
    const stored = await database.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, paidAt: true },
    });
    expect(stored.status).toBe("AWAITING_PAYMENT");
    expect(stored.paidAt).toBeNull();

    const payment = await database.payment.findFirstOrThrow({
      where: { orderId: order.id },
      select: { providerPaymentId: true },
    });
    if (payment.providerPaymentId) {
      providerIds.push(payment.providerPaymentId);
    }
  });

  it("marks the order paid only from a verified provider success and records commission", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 185_000);
    const payment = await createPendingPayment(order.id, order.orderNumber, 185_000);
    const providerPaymentId = `pay_${randomUUID()}`;
    providerIds.push(providerPaymentId);

    const result = await recordAndApplyPaymentEvent(database, {
      deliveryId: `delivery-${randomUUID()}`,
      eventType: "payment.completed",
      payment: {
        providerPaymentId,
        externalId: order.orderNumber,
        amountMinor: 191_350,
        feeMinor: 6_350,
        netMinor: 185_000,
        currency: "TZS",
        status: "completed",
        paymentMethod: "mpesa",
        customerPhone: "255754123456",
        providerReference: "ref_test",
        checkoutUrl: null,
        failureReason: null,
        completedAt: new Date(),
      },
    });

    expect(result.outcome).toBe("APPLIED");

    const stored = await database.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, paidAt: true, vendorOrders: { select: { status: true } } },
    });
    expect(stored.status).toBe("PAID");
    expect(stored.paidAt).not.toBeNull();
    expect(stored.vendorOrders[0]?.status).toBe("PAID");

    const ledger = await database.commissionLedger.findMany({
      where: { paymentId: payment.id },
      select: { type: true, amount: true },
    });
    const commission = ledger.find((entry) => entry.type === "PLATFORM_COMMISSION");
    const earning = ledger.find((entry) => entry.type === "VENDOR_EARNING");

    expect(decimalToCents(commission!.amount)).toBe(18_500);
    expect(decimalToCents(earning!.amount)).toBe(166_500);
    expect(decimalToCents(commission!.amount) + decimalToCents(earning!.amount)).toBe(185_000);
  });

  it("treats a repeated delivery as a duplicate without touching the ledger", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 100_000);
    const payment = await createPendingPayment(order.id, order.orderNumber, 100_000);
    const providerPaymentId = `pay_${randomUUID()}`;
    providerIds.push(providerPaymentId);
    const deliveryId = `delivery-${randomUUID()}`;
    const provider = {
      providerPaymentId,
      externalId: order.orderNumber,
      amountMinor: 100_000,
      feeMinor: 0,
      netMinor: 100_000,
      currency: "TZS",
      status: "completed" as const,
      paymentMethod: "airtel",
      customerPhone: null,
      providerReference: null,
      checkoutUrl: null,
      failureReason: null,
      completedAt: new Date(),
    };

    const first = await recordAndApplyPaymentEvent(database, {
      payment: provider,
      eventType: "payment.completed",
      deliveryId,
    });
    const second = await recordAndApplyPaymentEvent(database, {
      payment: provider,
      eventType: "payment.completed",
      deliveryId,
    });

    expect(first.outcome).toBe("APPLIED");
    expect(second.duplicate).toBe(true);
    expect(second.outcome).toBe("DUPLICATE");

    const ledgerCount = await database.commissionLedger.count({
      where: { paymentId: payment.id },
    });
    expect(ledgerCount).toBe(2);
  });

  it("does not let a late failure downgrade a successful payment", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 90_000);
    await createPendingPayment(order.id, order.orderNumber, 90_000);
    const providerPaymentId = `pay_${randomUUID()}`;
    providerIds.push(providerPaymentId);
    const base = {
      providerPaymentId,
      externalId: order.orderNumber,
      amountMinor: 90_000,
      feeMinor: 0,
      netMinor: 90_000,
      currency: "TZS",
      paymentMethod: "mpesa",
      customerPhone: null,
      providerReference: null,
      checkoutUrl: null,
      failureReason: null,
      completedAt: new Date(),
    };

    await applyProviderPayment(database, {
      payment: { ...base, status: "completed" },
      eventType: "payment.completed",
    });
    const late = await applyProviderPayment(database, {
      payment: { ...base, status: "failed", failureReason: "Late failure" },
      eventType: "payment.failed",
    });

    const stored = await database.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { status: true, payments: { select: { status: true } } },
    });
    expect(late.outcome).toBe("IGNORED");
    expect(stored.status).toBe("PAID");
    expect(stored.payments[0]?.status).toBe("SUCCEEDED");
  });

  it("reverses vendor earnings and platform commission on refund", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 100_000);
    await createPendingPayment(order.id, order.orderNumber, 100_000);
    const providerPaymentId = `pay_${randomUUID()}`;
    providerIds.push(providerPaymentId);

    await applyProviderPayment(database, {
      payment: {
        providerPaymentId,
        externalId: order.orderNumber,
        amountMinor: 100_000,
        feeMinor: 0,
        netMinor: 100_000,
        currency: "TZS",
        status: "completed",
        paymentMethod: "card",
        customerPhone: null,
        providerReference: null,
        checkoutUrl: null,
        failureReason: null,
        completedAt: new Date(),
      },
      eventType: "payment.completed",
    });

    const payment = await database.payment.findFirstOrThrow({
      where: { orderId: order.id },
      select: { id: true },
    });

    const adminId = await createUser("CUSTOMER");
    const result = await refundPayment(
      database,
      fakeGateway({ status: "completed", amountMinor: 0 }),
      {
        orderNumber: order.orderNumber,
        paymentId: payment.id,
        amountCents: 40_000,
        reason: "Partial return",
        adminId,
      },
    );

    expect(result.status).toBe("SUCCEEDED");
    expect(result.paymentStatus).toBe("PARTIALLY_REFUNDED");

    const ledger = await database.commissionLedger.findMany({
      where: { paymentId: payment.id },
      select: { amount: true },
    });
    const net = ledger.reduce((sum, entry) => sum + decimalToCents(entry.amount), 0);
    expect(net).toBe(60_000);

    const balance = await getVendorBalance(database, vendorId, "TZS");
    expect(balance.earningsCents).toBe(54_000);
    expect(balance.availableCents).toBe(54_000);
  });

  it("reserves payout balances and reconciles the transfer", async () => {
    const vendorId = await createVendor();
    const order = await createOrder(vendorId, 50_000);
    await createPendingPayment(order.id, order.orderNumber, 50_000);
    const providerPaymentId = `pay_${randomUUID()}`;
    providerIds.push(providerPaymentId);

    await applyProviderPayment(database, {
      payment: {
        providerPaymentId,
        externalId: order.orderNumber,
        amountMinor: 50_000,
        feeMinor: 0,
        netMinor: 50_000,
        currency: "TZS",
        status: "completed",
        paymentMethod: "card",
        customerPhone: null,
        providerReference: null,
        checkoutUrl: null,
        failureReason: null,
        completedAt: new Date(),
      },
      eventType: "payment.completed",
    });

    const adminId = await createUser("CUSTOMER");
    const payout = await createPayout(database, {
      vendorId,
      amountCents: 30_000,
      periodStart: new Date("2026-10-01T00:00:00.000Z"),
      periodEnd: new Date("2026-10-31T00:00:00.000Z"),
      note: "Integration payout",
      adminId,
    });

    const reserved = await getVendorBalance(database, vendorId, "TZS");
    expect(reserved.reservedCents).toBe(30_000);
    expect(reserved.availableCents).toBe(15_000);

    await markPayoutPaid(database, payout.id, adminId);

    const paid = await getVendorBalance(database, vendorId, "TZS");
    expect(paid.reservedCents).toBe(0);
    expect(paid.paidOutCents).toBe(30_000);
    expect(paid.availableCents).toBe(15_000);

    await reconcilePayout(database, payout.id, adminId);

    const stored = await database.payout.findUniqueOrThrow({
      where: { id: payout.id },
      select: { status: true, paidAt: true, reconciledAt: true },
    });
    expect(stored.status).toBe("RECONCILED");
    expect(stored.paidAt).not.toBeNull();
    expect(stored.reconciledAt).not.toBeNull();

    const settled = await getVendorBalance(database, vendorId, "TZS");
    expect(settled.earningsCents).toBe(45_000);
    expect(settled.reservedCents).toBe(0);
    expect(settled.paidOutCents).toBe(30_000);
    expect(settled.availableCents).toBe(15_000);
  });
});
