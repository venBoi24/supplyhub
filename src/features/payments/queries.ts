import "server-only";

import { connection } from "next/server";

import type {
  OrderStatus,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
} from "@/generated/prisma/enums";
import { DEFAULT_CURRENCY } from "@/features/catalog/constants";
import { decimalToCents } from "@/features/catalog/money";
import type { Actor } from "@/server/auth/actor";
import { canViewCustomerOrder } from "@/server/auth/policies";
import { getDatabase } from "@/server/db/client";

export interface CustomerPaymentView {
  id: string;
  attempt: number;
  status: PaymentStatus;
  method: string | null;
  maskedPhone: string | null;
  providerReference: string | null;
  checkoutUrl: string | null;
  hasProviderPaymentId: boolean;
  failureMessage: string | null;
  initiatedAt: Date;
  completedAt: Date | null;
  grossCents: number;
  feeCents: number;
  netCents: number;
  currency: string;
}

export interface CustomerRefundView {
  id: string;
  status: RefundStatus;
  amountCents: number;
  reason: string;
  createdAt: Date;
  processedAt: Date | null;
}

export interface OrderPaymentView {
  orderId: string;
  orderStatus: OrderStatus;
  currency: string;
  totalCents: number;
  paidAt: Date | null;
  reservationExpiresAt: Date | null;
  latestPayment: CustomerPaymentView | null;
  payments: CustomerPaymentView[];
  refunds: CustomerRefundView[];
  refundedCents: number;
  pendingRefundCents: number;
  canPay: boolean;
  canRefund: boolean;
}

function maskPhone(phone: string | null): string | null {
  if (!phone) {
    return null;
  }

  return phone.length <= 3 ? "***" : `${phone.slice(0, -3)}***`;
}

export async function getOrderPaymentView(
  actor: Actor,
  orderNumber: string,
): Promise<OrderPaymentView | null> {
  await connection();

  const row = await getDatabase().order.findUnique({
    where: { orderNumber },
    select: {
      id: true,
      customerId: true,
      status: true,
      currency: true,
      total: true,
      paidAt: true,
      reservationExpiresAt: true,
      payments: {
        orderBy: { attempt: "desc" },
        select: {
          id: true,
          attempt: true,
          status: true,
          paymentMethod: true,
          customerPhone: true,
          providerReference: true,
          checkoutUrl: true,
          providerPaymentId: true,
          failureMessage: true,
          initiatedAt: true,
          completedAt: true,
          amount: true,
          feeAmount: true,
          netAmount: true,
          currency: true,
        },
      },
      refunds: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          amount: true,
          reason: true,
          createdAt: true,
          processedAt: true,
        },
      },
    },
  });

  if (!row || !canViewCustomerOrder(actor, row.customerId)) {
    return null;
  }

  const payments = row.payments.map((payment) => ({
    id: payment.id,
    attempt: payment.attempt,
    status: payment.status,
    method: payment.paymentMethod,
    maskedPhone: maskPhone(payment.customerPhone),
    providerReference: payment.providerReference,
    checkoutUrl: payment.checkoutUrl,
    hasProviderPaymentId: payment.providerPaymentId !== null,
    failureMessage: payment.failureMessage,
    initiatedAt: payment.initiatedAt,
    completedAt: payment.completedAt,
    grossCents: decimalToCents(payment.amount),
    feeCents: decimalToCents(payment.feeAmount),
    netCents: decimalToCents(payment.netAmount),
    currency: payment.currency,
  }));
  const refunds = row.refunds.map((refund) => ({
    id: refund.id,
    status: refund.status,
    amountCents: decimalToCents(refund.amount),
    reason: refund.reason,
    createdAt: refund.createdAt,
    processedAt: refund.processedAt,
  }));
  const refundedCents = refunds
    .filter((refund) => refund.status === "SUCCEEDED")
    .reduce((total, refund) => total + refund.amountCents, 0);
  const pendingRefundCents = refunds
    .filter((refund) => refund.status === "PENDING")
    .reduce((total, refund) => total + refund.amountCents, 0);
  const latestPayment = payments[0] ?? null;
  const reservationOpen =
    !row.reservationExpiresAt || row.reservationExpiresAt.getTime() > Date.now();
  const remainingRefundable = latestPayment
    ? latestPayment.netCents - refundedCents - pendingRefundCents
    : 0;

  return {
    orderId: row.id,
    orderStatus: row.status,
    currency: row.currency,
    totalCents: decimalToCents(row.total),
    paidAt: row.paidAt,
    reservationExpiresAt: row.reservationExpiresAt,
    latestPayment,
    payments,
    refunds,
    refundedCents,
    pendingRefundCents,
    canPay:
      row.status === "AWAITING_PAYMENT" &&
      reservationOpen &&
      actor.role === "CUSTOMER" &&
      actor.id === row.customerId,
    canRefund:
      actor.role === "ADMIN" &&
      latestPayment !== null &&
      (latestPayment.status === "SUCCEEDED" || latestPayment.status === "PARTIALLY_REFUNDED") &&
      remainingRefundable > 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Administration                                                              */
/* -------------------------------------------------------------------------- */

export interface AdminRefundRow {
  id: string;
  status: RefundStatus;
  amountCents: number;
  reason: string;
  createdAt: Date;
  processedAt: Date | null;
}

export interface AdminPaymentRow {
  id: string;
  attempt: number;
  orderNumber: string;
  orderStatus: OrderStatus;
  status: PaymentStatus;
  method: string | null;
  currency: string;
  grossCents: number;
  feeCents: number;
  netCents: number;
  orderTotalCents: number;
  refundedCents: number;
  pendingRefundCents: number;
  ledgerNetCents: number;
  initiatedAt: Date;
  completedAt: Date | null;
  failureMessage: string | null;
  reconciled: boolean;
  issues: string[];
  refunds: AdminRefundRow[];
}

export interface PaymentReconciliationReport {
  rows: AdminPaymentRow[];
  totals: {
    successfulPayments: number;
    grossCents: number;
    feeCents: number;
    netCents: number;
    refundedCents: number;
    vendorEarningCents: number;
    platformCommissionCents: number;
    ledgerNetCents: number;
    reconciled: boolean;
    flaggedPayments: number;
  };
}

const FINANCIAL_STATUSES: PaymentStatus[] = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"];

export async function listPaymentReconciliation(limit = 60): Promise<PaymentReconciliationReport> {
  await connection();

  const database = getDatabase();
  const [rows, successful, refunded, ledgerTotals, statusCounts] = await Promise.all([
    database.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        attempt: true,
        status: true,
        paymentMethod: true,
        currency: true,
        amount: true,
        feeAmount: true,
        netAmount: true,
        initiatedAt: true,
        completedAt: true,
        failureMessage: true,
        order: { select: { orderNumber: true, status: true, total: true } },
        refunds: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            amount: true,
            reason: true,
            createdAt: true,
            processedAt: true,
          },
        },
      },
    }),
    database.payment.aggregate({
      where: { status: { in: FINANCIAL_STATUSES } },
      _count: true,
      _sum: { amount: true, feeAmount: true, netAmount: true },
    }),
    database.refund.aggregate({
      where: { status: "SUCCEEDED" },
      _sum: { amount: true },
    }),
    database.commissionLedger.groupBy({
      by: ["type"],
      _sum: { amount: true },
    }),
    database.payment.groupBy({
      by: ["status"],
      _count: true,
    }),
  ]);

  const rowsWithLedger = await database.commissionLedger.groupBy({
    by: ["paymentId"],
    where: { paymentId: { in: rows.map((row) => row.id) } },
    _sum: { amount: true },
  });
  const ledgerByPayment = new Map(
    rowsWithLedger.map((row) => [
      row.paymentId,
      row._sum.amount ? decimalToCents(row._sum.amount) : 0,
    ]),
  );

  const mapped = rows.map((row) => {
    const refunds = row.refunds.map((refund) => ({
      id: refund.id,
      status: refund.status,
      amountCents: decimalToCents(refund.amount),
      reason: refund.reason,
      createdAt: refund.createdAt,
      processedAt: refund.processedAt,
    }));
    const refundedCents = refunds
      .filter((refund) => refund.status === "SUCCEEDED")
      .reduce((total, refund) => total + refund.amountCents, 0);
    const pendingRefundCents = refunds
      .filter((refund) => refund.status === "PENDING")
      .reduce((total, refund) => total + refund.amountCents, 0);
    const grossCents = decimalToCents(row.amount);
    const feeCents = decimalToCents(row.feeAmount);
    const netCents = decimalToCents(row.netAmount);
    const orderTotalCents = decimalToCents(row.order.total);
    const ledgerNetCents = ledgerByPayment.get(row.id) ?? 0;
    const issues: string[] = [];
    const financial = FINANCIAL_STATUSES.includes(row.status);

    if (row.status === "DISPUTED") {
      issues.push("Flagged by the provider or by an amount check.");
    }

    if (financial) {
      if (grossCents !== netCents + feeCents) {
        issues.push("Gross amount does not equal net plus fee.");
      }

      if (netCents !== orderTotalCents) {
        issues.push("Net amount does not match the order total.");
      }

      if (ledgerNetCents !== netCents - refundedCents) {
        issues.push("Commission ledger does not match net minus refunds.");
      }

      if (
        (row.status === "REFUNDED" || row.status === "PARTIALLY_REFUNDED") &&
        refundedCents === 0
      ) {
        issues.push("Provider reports a refund with no local refund record.");
      }

      if (row.order.status !== "PAID") {
        issues.push("Payment succeeded but the order is not marked paid.");
      }
    }

    return {
      id: row.id,
      attempt: row.attempt,
      orderNumber: row.order.orderNumber,
      orderStatus: row.order.status,
      status: row.status,
      method: row.paymentMethod,
      currency: row.currency,
      grossCents,
      feeCents,
      netCents,
      orderTotalCents,
      refundedCents,
      pendingRefundCents,
      ledgerNetCents,
      initiatedAt: row.initiatedAt,
      completedAt: row.completedAt,
      failureMessage: row.failureMessage,
      reconciled: issues.length === 0,
      issues,
      refunds,
    };
  });

  const vendorEarningCents = ledgerTotals.find((row) => row.type === "VENDOR_EARNING")?._sum.amount
    ? decimalToCents(ledgerTotals.find((row) => row.type === "VENDOR_EARNING")!._sum.amount!)
    : 0;
  const platformCommissionCents = ledgerTotals.find((row) => row.type === "PLATFORM_COMMISSION")
    ?._sum.amount
    ? decimalToCents(ledgerTotals.find((row) => row.type === "PLATFORM_COMMISSION")!._sum.amount!)
    : 0;
  const netCents = successful._sum.netAmount ? decimalToCents(successful._sum.netAmount) : 0;
  const refundedCents = refunded._sum.amount ? decimalToCents(refunded._sum.amount) : 0;
  const ledgerNetCents = vendorEarningCents + platformCommissionCents;
  const flaggedFromStatuses = statusCounts
    .filter((row) => row.status === "DISPUTED")
    .reduce((total, row) => total + row._count, 0);

  return {
    rows: mapped,
    totals: {
      successfulPayments: successful._count,
      grossCents: successful._sum?.amount ? decimalToCents(successful._sum.amount) : 0,
      feeCents: successful._sum?.feeAmount ? decimalToCents(successful._sum.feeAmount) : 0,
      netCents,
      refundedCents,
      vendorEarningCents,
      platformCommissionCents,
      ledgerNetCents,
      reconciled: ledgerNetCents === netCents - refundedCents,
      flaggedPayments: flaggedFromStatuses + mapped.filter((row) => !row.reconciled).length,
    },
  };
}

export interface PayoutVendorRow {
  id: string;
  name: string;
  slug: string;
  earningsCents: number;
  reservedCents: number;
  paidOutCents: number;
  availableCents: number;
}

export interface PayoutRow {
  id: string;
  vendorId: string;
  vendorName: string;
  status: PayoutStatus;
  amountCents: number;
  currency: string;
  reference: string | null;
  note: string | null;
  periodStart: Date;
  periodEnd: Date;
  paidAt: Date | null;
  reconciledAt: Date | null;
  createdAt: Date;
}

export interface PayoutOverview {
  vendors: PayoutVendorRow[];
  payouts: PayoutRow[];
  totals: {
    vendorEarningsCents: number;
    reservedCents: number;
    paidOutCents: number;
    availableCents: number;
  };
}

const HELD_PAYOUT_STATUSES: PayoutStatus[] = ["PENDING", "APPROVED", "PROCESSING"];
const PAID_PAYOUT_STATUSES: PayoutStatus[] = ["PAID", "RECONCILED"];

export async function listPayoutOverview(): Promise<PayoutOverview> {
  await connection();

  const database = getDatabase();
  const [vendors, earnings, held, paidOut, payouts] = await Promise.all([
    database.vendor.findMany({
      where: { status: "APPROVED" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
    database.commissionLedger.groupBy({
      by: ["vendorId"],
      where: {
        type: "VENDOR_EARNING",
        currency: DEFAULT_CURRENCY,
        vendorId: { not: null },
      },
      _sum: { amount: true },
    }),
    database.payout.groupBy({
      by: ["vendorId"],
      where: { status: { in: HELD_PAYOUT_STATUSES }, currency: DEFAULT_CURRENCY },
      _sum: { amount: true },
    }),
    database.payout.groupBy({
      by: ["vendorId"],
      where: { status: { in: PAID_PAYOUT_STATUSES }, currency: DEFAULT_CURRENCY },
      _sum: { amount: true },
    }),
    database.payout.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        vendorId: true,
        status: true,
        amount: true,
        currency: true,
        reference: true,
        note: true,
        periodStart: true,
        periodEnd: true,
        paidAt: true,
        reconciledAt: true,
        createdAt: true,
        vendor: { select: { name: true } },
      },
    }),
  ]);

  const earningsByVendor = new Map(
    earnings.map((row) => [row.vendorId, row._sum.amount ? decimalToCents(row._sum.amount) : 0]),
  );
  const reservedByVendor = new Map(
    held.map((row) => [row.vendorId, row._sum.amount ? decimalToCents(row._sum.amount) : 0]),
  );
  const paidOutByVendor = new Map(
    paidOut.map((row) => [row.vendorId, row._sum.amount ? decimalToCents(row._sum.amount) : 0]),
  );
  const vendorRows = vendors.map((vendor) => {
    const earningsCents = earningsByVendor.get(vendor.id) ?? 0;
    const reservedCents = reservedByVendor.get(vendor.id) ?? 0;
    const paidOutCents = paidOutByVendor.get(vendor.id) ?? 0;

    return {
      id: vendor.id,
      name: vendor.name,
      slug: vendor.slug,
      earningsCents,
      reservedCents,
      paidOutCents,
      availableCents: earningsCents - reservedCents - paidOutCents,
    };
  });

  return {
    vendors: vendorRows,
    payouts: payouts.map((payout) => ({
      id: payout.id,
      vendorId: payout.vendorId,
      vendorName: payout.vendor.name,
      status: payout.status,
      amountCents: decimalToCents(payout.amount),
      currency: payout.currency,
      reference: payout.reference,
      note: payout.note,
      periodStart: payout.periodStart,
      periodEnd: payout.periodEnd,
      paidAt: payout.paidAt,
      reconciledAt: payout.reconciledAt,
      createdAt: payout.createdAt,
    })),
    totals: {
      vendorEarningsCents: vendorRows.reduce((total, row) => total + row.earningsCents, 0),
      reservedCents: vendorRows.reduce((total, row) => total + row.reservedCents, 0),
      paidOutCents: vendorRows.reduce((total, row) => total + row.paidOutCents, 0),
      availableCents: vendorRows.reduce((total, row) => total + row.availableCents, 0),
    },
  };
}
