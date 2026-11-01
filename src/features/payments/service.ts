import "server-only";

import { randomBytes } from "node:crypto";

import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { OrderStatus, PaymentEventOutcome, PaymentStatus } from "@/generated/prisma/enums";
import { DEFAULT_CURRENCY } from "@/features/catalog/constants";
import {
  centsToDecimalString,
  centsToSignedDecimalString,
  decimalToCents,
} from "@/features/catalog/money";
import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { LynxPayRequestError } from "@/server/payments/lynxpay/client";
import type { GatewayPayment, PaymentGateway } from "@/server/payments/types";

import {
  allocateCommission,
  allocateRefund,
  reverseCommission,
  type CommissionAllocation,
} from "./ledger";

export type PaymentErrorCode =
  | "order-not-found"
  | "order-not-payable"
  | "payment-not-found"
  | "payment-not-refundable"
  | "amount-invalid"
  | "amount-mismatch"
  | "currency-unsupported"
  | "provider-error"
  | "gateway-unavailable"
  | "refund-exceeds-balance"
  | "vendor-not-found"
  | "balance-insufficient"
  | "payout-not-found"
  | "payout-transition-invalid"
  | "invalid-request";

export class PaymentError extends Error {
  constructor(
    readonly code: PaymentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

class LedgerIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LedgerIntegrityError";
  }
}

const MOBILE_METHODS = new Set(["mpesa", "tigopesa", "airtel", "halopesa"]);
const SUCCESS_STATUSES: readonly PaymentStatus[] = ["SUCCEEDED", "REFUNDED", "PARTIALLY_REFUNDED"];

function truncate(value: string | null | undefined, max: number): string | null {
  if (!value) {
    return null;
  }

  return value.length > max ? value.slice(0, max) : value;
}

function providerToPaymentStatus(status: GatewayPayment["status"]): PaymentStatus {
  switch (status) {
    case "completed":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "expired":
      return "EXPIRED";
    case "refunded":
      return "REFUNDED";
    case "partially_refunded":
      return "PARTIALLY_REFUNDED";
    case "disputed":
      return "DISPUTED";
    case "processing":
    default:
      return "PROCESSING";
  }
}

function gatewayFields(payment: GatewayPayment, currentProviderId: string | null) {
  return {
    providerPaymentId: currentProviderId ?? payment.providerPaymentId,
    providerReference: truncate(payment.providerReference, 128),
    checkoutUrl: payment.checkoutUrl,
    amount: centsToDecimalString(payment.amountMinor),
    feeAmount: centsToDecimalString(payment.feeMinor),
    netAmount: centsToDecimalString(payment.netMinor),
    paymentMethod: truncate(payment.paymentMethod, 32),
    customerPhone: truncate(payment.customerPhone, 20),
  };
}

async function lockPayment(transaction: Prisma.TransactionClient, paymentId: string) {
  await transaction.$queryRaw`
    SELECT "id" FROM "payments" WHERE "id" = ${paymentId}::uuid FOR UPDATE
  `;
}

async function lockOrder(transaction: Prisma.TransactionClient, orderId: string) {
  await transaction.$queryRaw`
    SELECT "id" FROM "orders" WHERE "id" = ${orderId}::uuid FOR UPDATE
  `;
}

/* -------------------------------------------------------------------------- */
/* Payment initiation                                                          */
/* -------------------------------------------------------------------------- */

export interface StartPaymentInput {
  orderNumber: string;
  customerId: string;
  method: string;
  phone: string;
}

export interface StartPaymentResult {
  paymentId: string;
  attempt: number;
  status: PaymentStatus;
  method: string;
  checkoutUrl: string | null;
  reused: boolean;
}

interface PreparedPayment {
  paymentId: string;
  attempt: number;
  status: PaymentStatus;
  method: string;
  phone: string | null;
  checkoutUrl: string | null;
  reused: boolean;
  orderNumber: string;
  totalCents: number;
  currency: string;
  idempotencyKey: string;
}

async function preparePayment(
  database: PrismaClient,
  input: StartPaymentInput,
): Promise<PreparedPayment> {
  return database.$transaction(async (transaction) => {
    const selected = await transaction.order.findFirst({
      where: { orderNumber: input.orderNumber, customerId: input.customerId },
      select: { id: true },
    });

    if (!selected) {
      throw new PaymentError("order-not-found", "That order could not be found.");
    }

    await lockOrder(transaction, selected.id);

    const order = await transaction.order.findUnique({
      where: { id: selected.id },
      select: {
        id: true,
        orderNumber: true,
        customerId: true,
        status: true,
        total: true,
        currency: true,
        reservationExpiresAt: true,
      },
    });

    if (!order || order.customerId !== input.customerId) {
      throw new PaymentError("order-not-found", "That order could not be found.");
    }

    if (order.status !== "AWAITING_PAYMENT") {
      throw new PaymentError(
        "order-not-payable",
        order.status === "PAID"
          ? "This order is already paid."
          : "This order is no longer awaiting payment.",
      );
    }

    if (order.reservationExpiresAt && order.reservationExpiresAt.getTime() <= Date.now()) {
      throw new PaymentError(
        "order-not-payable",
        "The stock reservation for this order expired. Place a new order to try again.",
      );
    }

    if (order.currency !== DEFAULT_CURRENCY) {
      throw new PaymentError(
        "currency-unsupported",
        `LynxPay cannot collect ${order.currency}. This storefront settles in ${DEFAULT_CURRENCY}.`,
      );
    }

    const totalCents = decimalToCents(order.total);

    if (totalCents <= 0 || totalCents % 100 !== 0) {
      throw new PaymentError(
        "amount-invalid",
        "This order total cannot be charged in whole shillings. Contact support.",
      );
    }

    const active = await transaction.payment.findFirst({
      where: { orderId: order.id, status: { in: ["PENDING", "PROCESSING"] } },
      orderBy: { attempt: "desc" },
      select: {
        id: true,
        attempt: true,
        status: true,
        paymentMethod: true,
        customerPhone: true,
        checkoutUrl: true,
        providerPaymentId: true,
        idempotencyKey: true,
      },
    });

    if (active && active.providerPaymentId) {
      return {
        paymentId: active.id,
        attempt: active.attempt,
        status: active.status,
        method: active.paymentMethod ?? input.method,
        phone: active.customerPhone,
        checkoutUrl: active.checkoutUrl,
        reused: true,
        orderNumber: order.orderNumber,
        totalCents,
        currency: order.currency,
        idempotencyKey: active.idempotencyKey,
      };
    }

    if (active) {
      // A previous provider call failed before returning an id. Reuse the same
      // idempotency key so a retry cannot create a second charge.
      await transaction.payment.update({
        where: { id: active.id },
        data: {
          paymentMethod: input.method,
          customerPhone: input.phone || null,
          failureCode: null,
          failureMessage: null,
        },
      });

      return {
        paymentId: active.id,
        attempt: active.attempt,
        status: active.status,
        method: input.method,
        phone: input.phone || null,
        checkoutUrl: active.checkoutUrl,
        reused: true,
        orderNumber: order.orderNumber,
        totalCents,
        currency: order.currency,
        idempotencyKey: active.idempotencyKey,
      };
    }

    const latest = await transaction.payment.findFirst({
      where: { orderId: order.id },
      orderBy: { attempt: "desc" },
      select: { attempt: true },
    });
    const attempt = (latest?.attempt ?? 0) + 1;
    const idempotencyKey = `lynxpay:${order.id}:${attempt}`;
    const payment = await transaction.payment.create({
      data: {
        orderId: order.id,
        attempt,
        status: "PENDING",
        amount: centsToDecimalString(totalCents),
        feeAmount: "0.00",
        netAmount: centsToDecimalString(totalCents),
        currency: order.currency,
        paymentMethod: input.method,
        customerPhone: input.phone || null,
        idempotencyKey,
      },
      select: { id: true },
    });

    await recordAuditEvent(transaction, {
      actorId: input.customerId,
      action: "PAYMENT_INITIATED",
      targetType: "payment",
      targetId: payment.id,
      metadata: {
        orderNumber: order.orderNumber,
        attempt,
        method: input.method,
        amountCents: totalCents,
      },
    });

    return {
      paymentId: payment.id,
      attempt,
      status: "PENDING" as const,
      method: input.method,
      phone: input.phone || null,
      checkoutUrl: null,
      reused: false,
      orderNumber: order.orderNumber,
      totalCents,
      currency: order.currency,
      idempotencyKey,
    };
  });
}

async function recordInitiationFailure(
  database: PrismaClient,
  payment: PreparedPayment,
  error: unknown,
): Promise<void> {
  const providerError = error instanceof LynxPayRequestError ? error : null;
  const retryable = providerError?.retryable ?? true;
  const code = truncate(providerError?.code ?? "PROVIDER_ERROR", 64) ?? "PROVIDER_ERROR";
  const message = retryable
    ? "LynxPay could not be reached. Check your connection and try again."
    : "LynxPay rejected this payment. Try another method or check the number.";

  try {
    await database.$transaction(async (transaction) => {
      await transaction.payment.update({
        where: { id: payment.paymentId },
        data: {
          status: retryable ? "PENDING" : "FAILED",
          failureCode: code,
          failureMessage: message,
          failedAt: retryable ? null : new Date(),
        },
      });

      if (!retryable) {
        await recordAuditEvent(transaction, {
          actorId: null,
          action: "PAYMENT_FAILED",
          targetType: "payment",
          targetId: payment.paymentId,
          metadata: { orderNumber: payment.orderNumber, code },
        });
      }
    });
  } catch (updateError) {
    logger.warn("payment.initiation_failure_not_recorded", {
      paymentId: payment.paymentId,
      error: updateError,
    });
  }

  logger.warn("payment.initiation_failed", {
    paymentId: payment.paymentId,
    code,
    retryable,
  });
}

export async function startPayment(
  database: PrismaClient,
  gateway: PaymentGateway,
  input: StartPaymentInput,
): Promise<StartPaymentResult> {
  const prepared = await preparePayment(database, input);
  const siteUrl = getServerEnv().NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");

  let providerPayment: GatewayPayment;

  try {
    providerPayment = await gateway.createPayment({
      amountMinor: prepared.totalCents,
      currency: prepared.currency,
      phone: prepared.phone ?? undefined,
      method: prepared.method as Parameters<PaymentGateway["createPayment"]>[0]["method"],
      externalId: prepared.orderNumber,
      description: `SupplyHub order ${prepared.orderNumber}`,
      callbackUrl: `${siteUrl}/orders/${prepared.orderNumber}?payment=return`,
      metadata: {
        orderNumber: prepared.orderNumber,
        attempt: String(prepared.attempt),
      },
      idempotencyKey: prepared.idempotencyKey,
    });
  } catch (error) {
    await recordInitiationFailure(database, prepared, error);

    if (error instanceof LynxPayRequestError && error.retryable) {
      throw new PaymentError(
        "gateway-unavailable",
        "LynxPay could not be reached. Check your connection and try again.",
      );
    }

    throw new PaymentError(
      "provider-error",
      "LynxPay could not start this payment. Try another method or check the number.",
    );
  }

  const outcome = await applyProviderPayment(database, {
    payment: providerPayment,
    paymentId: prepared.paymentId,
    eventType: "payment.created",
  });

  if (outcome.outcome === "MISMATCH") {
    throw new PaymentError(
      "amount-mismatch",
      "LynxPay returned an amount that does not match this order. The payment was flagged for review.",
    );
  }

  const stored = await database.payment.findUnique({
    where: { id: prepared.paymentId },
    select: { status: true, checkoutUrl: true },
  });

  return {
    paymentId: prepared.paymentId,
    attempt: prepared.attempt,
    status: stored?.status ?? prepared.status,
    method: prepared.method,
    checkoutUrl: stored?.checkoutUrl ?? providerPayment.checkoutUrl,
    reused: prepared.reused,
  };
}

/* -------------------------------------------------------------------------- */
/* Provider event application                                                  */
/* -------------------------------------------------------------------------- */

export interface ApplyProviderPaymentInput {
  payment: GatewayPayment;
  paymentId?: string;
  eventType?: string;
}

export interface ApplyProviderPaymentResult {
  outcome: PaymentEventOutcome;
  paymentId: string | null;
  orderId: string | null;
  orderNumber: string | null;
  orderStatus: OrderStatus | null;
  paymentStatus: PaymentStatus | null;
  reason?: string;
}

async function findTargetPayment(
  transaction: Prisma.TransactionClient,
  input: ApplyProviderPaymentInput,
): Promise<{ id: string } | null> {
  if (input.paymentId) {
    return { id: input.paymentId };
  }

  const byProvider = await transaction.payment.findUnique({
    where: { providerPaymentId: input.payment.providerPaymentId },
    select: { id: true },
  });

  if (byProvider) {
    return byProvider;
  }

  if (!input.payment.externalId) {
    return null;
  }

  const order = await transaction.order.findUnique({
    where: { orderNumber: input.payment.externalId },
    select: { id: true },
  });

  if (!order) {
    return null;
  }

  return transaction.payment.findFirst({
    where: { orderId: order.id, providerPaymentId: null },
    orderBy: { attempt: "desc" },
    select: { id: true },
  });
}

async function writeCommissionEntries(
  transaction: Prisma.TransactionClient,
  paymentId: string,
  order: { id: string; total: Prisma.Decimal; currency: string },
): Promise<void> {
  const env = getServerEnv();
  const version = env.COMMISSION_RULE_VERSION;
  const basisPoints = env.PLATFORM_COMMISSION_BPS;
  const description =
    "Configurable default commission recorded until marketplace policy is approved.";

  const rule = await transaction.commissionRule.upsert({
    where: { version },
    create: { version, basisPoints, description },
    update: {},
  });

  if (rule.basisPoints !== basisPoints) {
    throw new LedgerIntegrityError(
      `Commission rule ${version} is pinned at ${rule.basisPoints} bps but the environment requests ${basisPoints} bps.`,
    );
  }

  const vendorOrders = await transaction.vendorOrder.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, vendorId: true, subtotal: true },
  });

  const shares = vendorOrders.map((vendorOrder) => ({
    vendorOrderId: vendorOrder.id,
    vendorId: vendorOrder.vendorId,
    subtotalCents: decimalToCents(vendorOrder.subtotal),
  }));
  const orderTotalCents = decimalToCents(order.total);
  const shareTotal = shares.reduce((total, share) => total + share.subtotalCents, 0);

  if (shareTotal !== orderTotalCents) {
    throw new LedgerIntegrityError(
      "Vendor subtotals do not add up to the order total, so commission cannot be allocated.",
    );
  }

  const allocations = allocateCommission(shares, basisPoints);
  const entries = allocations.flatMap((allocation) => [
    {
      entryKey: `payment:${paymentId}:vo:${allocation.vendorOrderId}:earning`,
      paymentId,
      orderId: order.id,
      vendorOrderId: allocation.vendorOrderId,
      vendorId: allocation.vendorId,
      commissionRuleId: rule.id,
      type: "VENDOR_EARNING" as const,
      amount: centsToDecimalString(allocation.earningCents),
      currency: order.currency,
      basisPoints,
    },
    {
      entryKey: `payment:${paymentId}:vo:${allocation.vendorOrderId}:commission`,
      paymentId,
      orderId: order.id,
      vendorOrderId: allocation.vendorOrderId,
      vendorId: allocation.vendorId,
      commissionRuleId: rule.id,
      type: "PLATFORM_COMMISSION" as const,
      amount: centsToDecimalString(allocation.commissionCents),
      currency: order.currency,
      basisPoints,
    },
  ]);

  await transaction.commissionLedger.createMany({ data: entries, skipDuplicates: true });
}

export async function applyProviderPayment(
  database: PrismaClient,
  input: ApplyProviderPaymentInput,
): Promise<ApplyProviderPaymentResult> {
  const provider = input.payment;
  const providerStatus = providerToPaymentStatus(provider.status);

  return database.$transaction(async (transaction) => {
    const target = await findTargetPayment(transaction, input);

    if (!target) {
      return {
        outcome: "UNKNOWN_ORDER",
        paymentId: null,
        orderId: null,
        orderNumber: provider.externalId,
        orderStatus: null,
        paymentStatus: null,
        reason: "No matching payment or order.",
      };
    }

    await lockPayment(transaction, target.id);

    const locked = await transaction.payment.findUnique({
      where: { id: target.id },
      select: { id: true, orderId: true, providerPaymentId: true, status: true },
    });

    if (!locked) {
      return {
        outcome: "UNKNOWN_ORDER",
        paymentId: null,
        orderId: null,
        orderNumber: provider.externalId,
        orderStatus: null,
        paymentStatus: null,
        reason: "The payment disappeared before it was applied.",
      };
    }

    await lockOrder(transaction, locked.orderId);

    const payment = await transaction.payment.findUnique({
      where: { id: locked.id },
      include: { order: true },
    });

    if (!payment) {
      return {
        outcome: "UNKNOWN_ORDER",
        paymentId: null,
        orderId: locked.orderId,
        orderNumber: provider.externalId,
        orderStatus: null,
        paymentStatus: null,
        reason: "The payment disappeared before it was applied.",
      };
    }

    const base: ApplyProviderPaymentResult = {
      outcome: "DUPLICATE",
      paymentId: payment.id,
      orderId: payment.orderId,
      orderNumber: payment.order.orderNumber,
      orderStatus: payment.order.status,
      paymentStatus: payment.status,
    };

    const providerIdConflict =
      payment.providerPaymentId !== null &&
      payment.providerPaymentId !== provider.providerPaymentId;
    const orderTotalCents = decimalToCents(payment.order.total);
    const currencyMatches = provider.currency === payment.order.currency;
    const netMatches = provider.netMinor === orderTotalCents;
    const feeConsistent = provider.amountMinor === provider.netMinor + provider.feeMinor;
    const externalMatches =
      provider.externalId === null || provider.externalId === payment.order.orderNumber;
    const amountRelevant = providerStatus === "SUCCEEDED" || providerStatus === "PROCESSING";
    const providerIdTooLong = provider.providerPaymentId.length > 128;

    if (
      providerIdConflict ||
      providerIdTooLong ||
      !currencyMatches ||
      !externalMatches ||
      (amountRelevant && (!netMatches || !feeConsistent))
    ) {
      const reason = providerIdConflict
        ? "Provider payment id changed for an existing attempt."
        : providerIdTooLong
          ? "Provider payment id is too long to store safely."
          : !currencyMatches
            ? "Provider currency does not match the order."
            : !externalMatches
              ? "Provider external id does not match the order number."
              : !netMatches
                ? "Provider net amount does not match the order total."
                : "Provider gross amount does not equal net plus fee.";

      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          ...gatewayFields(provider, payment.providerPaymentId),
          status: "DISPUTED",
          failureCode: "AMOUNT_MISMATCH",
          failureMessage: truncate(reason, 500),
          completedAt: provider.completedAt ?? payment.completedAt,
        },
      });

      await recordAuditEvent(transaction, {
        actorId: null,
        action: "PAYMENT_MISMATCH",
        targetType: "order",
        targetId: payment.orderId,
        metadata: {
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          providerPaymentId: truncate(provider.providerPaymentId, 128),
          reason,
        },
      });

      return {
        ...base,
        outcome: "MISMATCH",
        paymentStatus: "DISPUTED",
        reason,
      };
    }

    if (providerStatus === "SUCCEEDED") {
      if (SUCCESS_STATUSES.includes(payment.status) || payment.status === "DISPUTED") {
        return {
          ...base,
          outcome: payment.status === "DISPUTED" ? "MISMATCH" : "DUPLICATE",
          reason:
            payment.status === "DISPUTED"
              ? "The payment remains flagged for manual review."
              : undefined,
        };
      }

      if (payment.order.status !== "AWAITING_PAYMENT") {
        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            ...gatewayFields(provider, payment.providerPaymentId),
            status: "SUCCEEDED",
            completedAt: provider.completedAt ?? new Date(),
            failureCode: "LATE_PAYMENT",
            failureMessage:
              "Payment completed after the order stopped awaiting payment. Refund or reconcile manually.",
          },
        });

        await recordAuditEvent(transaction, {
          actorId: null,
          action: "PAYMENT_MISMATCH",
          targetType: "order",
          targetId: payment.orderId,
          metadata: {
            orderNumber: payment.order.orderNumber,
            paymentId: payment.id,
            reason: "late-payment",
            orderStatus: payment.order.status,
          },
        });

        return {
          ...base,
          outcome: "IGNORED",
          orderStatus: payment.order.status,
          paymentStatus: "SUCCEEDED",
          reason: "Payment completed after the order stopped awaiting payment.",
        };
      }

      try {
        await writeCommissionEntries(transaction, payment.id, payment.order);
      } catch (error) {
        if (!(error instanceof LedgerIntegrityError)) {
          throw error;
        }

        await transaction.payment.update({
          where: { id: payment.id },
          data: {
            ...gatewayFields(provider, payment.providerPaymentId),
            status: "DISPUTED",
            completedAt: provider.completedAt ?? new Date(),
            failureCode: "LEDGER_INTEGRITY",
            failureMessage: truncate(error.message, 500),
          },
        });

        await recordAuditEvent(transaction, {
          actorId: null,
          action: "PAYMENT_MISMATCH",
          targetType: "order",
          targetId: payment.orderId,
          metadata: {
            orderNumber: payment.order.orderNumber,
            paymentId: payment.id,
            reason: "ledger-integrity",
          },
        });

        return {
          ...base,
          outcome: "MISMATCH",
          paymentStatus: "DISPUTED",
          reason: error.message,
        };
      }

      const paidAt = provider.completedAt ?? new Date();

      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          ...gatewayFields(provider, payment.providerPaymentId),
          status: "SUCCEEDED",
          completedAt: paidAt,
          failureCode: null,
          failureMessage: null,
          failedAt: null,
        },
      });

      await transaction.order.update({
        where: { id: payment.orderId },
        data: { status: "PAID", paidAt },
      });

      await transaction.vendorOrder.updateMany({
        where: { orderId: payment.orderId },
        data: { status: "PAID" },
      });

      await recordAuditEvent(transaction, {
        actorId: null,
        action: "PAYMENT_SUCCEEDED",
        targetType: "order",
        targetId: payment.orderId,
        metadata: {
          orderNumber: payment.order.orderNumber,
          paymentId: payment.id,
          netCents: provider.netMinor,
          feeCents: provider.feeMinor,
          grossCents: provider.amountMinor,
        },
      });

      logger.info("payment.succeeded", {
        orderNumber: payment.order.orderNumber,
        paymentId: payment.id,
      });

      return {
        ...base,
        outcome: "APPLIED",
        orderStatus: "PAID",
        paymentStatus: "SUCCEEDED",
      };
    }

    if (providerStatus === "FAILED" || providerStatus === "EXPIRED") {
      if (SUCCESS_STATUSES.includes(payment.status) || payment.status === "DISPUTED") {
        return {
          ...base,
          outcome: "IGNORED",
          reason: "A later failure event cannot undo a completed payment.",
        };
      }

      const failedStatus = providerStatus as "FAILED" | "EXPIRED";

      if (payment.status === failedStatus) {
        return { ...base, outcome: "DUPLICATE" };
      }

      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          ...gatewayFields(provider, payment.providerPaymentId),
          status: failedStatus,
          failureCode: `PROVIDER_${provider.status.toUpperCase()}`.slice(0, 64),
          failureMessage: truncate(
            provider.failureReason ?? "LynxPay reported that the payment did not complete.",
            500,
          ),
          failedAt: new Date(),
        },
      });

      await recordAuditEvent(transaction, {
        actorId: null,
        action: "PAYMENT_FAILED",
        targetType: "payment",
        targetId: payment.id,
        metadata: {
          orderNumber: payment.order.orderNumber,
          providerStatus: provider.status,
          code: `PROVIDER_${provider.status.toUpperCase()}`.slice(0, 64),
        },
      });

      return {
        ...base,
        outcome: "APPLIED",
        paymentStatus: failedStatus,
      };
    }

    if (providerStatus === "REFUNDED" || providerStatus === "PARTIALLY_REFUNDED") {
      if (payment.status === providerStatus) {
        return { ...base, outcome: "DUPLICATE" };
      }

      await transaction.payment.update({
        where: { id: payment.id },
        data: {
          ...gatewayFields(provider, payment.providerPaymentId),
          status: providerStatus,
          completedAt: provider.completedAt ?? payment.completedAt,
        },
      });

      return { ...base, outcome: "APPLIED", paymentStatus: providerStatus };
    }

    // processing or disputed
    if (payment.status === providerStatus) {
      return { ...base, outcome: "DUPLICATE" };
    }

    if (SUCCESS_STATUSES.includes(payment.status)) {
      return { ...base, outcome: "IGNORED" };
    }

    await transaction.payment.update({
      where: { id: payment.id },
      data: {
        ...gatewayFields(provider, payment.providerPaymentId),
        status: providerStatus,
        failureCode: providerStatus === "DISPUTED" ? "PROVIDER_DISPUTE" : null,
        failureMessage:
          providerStatus === "DISPUTED" ? truncate(provider.failureReason, 500) : null,
      },
    });

    if (providerStatus === "DISPUTED") {
      await recordAuditEvent(transaction, {
        actorId: null,
        action: "PAYMENT_MISMATCH",
        targetType: "payment",
        targetId: payment.id,
        metadata: {
          orderNumber: payment.order.orderNumber,
          reason: "provider-dispute",
        },
      });
    }

    return { ...base, outcome: "APPLIED", paymentStatus: providerStatus };
  });
}

export async function syncPaymentStatus(
  database: PrismaClient,
  gateway: PaymentGateway,
  paymentId: string,
): Promise<PaymentStatus | null> {
  const payment = await database.payment.findUnique({
    where: { id: paymentId },
    select: { id: true, status: true, providerPaymentId: true },
  });

  if (!payment) {
    return null;
  }

  if (
    !payment.providerPaymentId ||
    (payment.status !== "PENDING" && payment.status !== "PROCESSING")
  ) {
    return payment.status;
  }

  const providerPayment = await gateway.getPayment(payment.providerPaymentId);
  await applyProviderPayment(database, {
    payment: providerPayment,
    paymentId: payment.id,
    eventType: "payment.status_poll",
  });

  const refreshed = await database.payment.findUnique({
    where: { id: payment.id },
    select: { status: true },
  });

  return refreshed?.status ?? payment.status;
}

/* -------------------------------------------------------------------------- */
/* Refunds                                                                     */
/* -------------------------------------------------------------------------- */

export interface RefundPaymentInput {
  orderNumber: string;
  paymentId: string;
  amountCents: number;
  reason: string;
  adminId: string;
}

export interface RefundPaymentResult {
  refundId: string;
  status: "SUCCEEDED";
  paymentStatus: PaymentStatus;
  refundedCents: number;
}

interface PreparedRefund {
  refundId: string;
  paymentId: string;
  providerPaymentId: string;
  orderNumber: string;
  amountCents: number;
  reason: string;
}

async function prepareRefund(
  database: PrismaClient,
  input: RefundPaymentInput,
): Promise<PreparedRefund> {
  return database.$transaction(async (transaction) => {
    const selected = await transaction.payment.findFirst({
      where: { id: input.paymentId, order: { orderNumber: input.orderNumber } },
      select: { id: true, orderId: true },
    });

    if (!selected) {
      throw new PaymentError("payment-not-found", "That payment could not be found.");
    }

    await lockPayment(transaction, selected.id);
    await lockOrder(transaction, selected.orderId);

    const payment = await transaction.payment.findUnique({
      where: { id: selected.id },
      include: { order: { select: { orderNumber: true, total: true } } },
    });

    if (!payment || payment.order.orderNumber !== input.orderNumber) {
      throw new PaymentError("payment-not-found", "That payment could not be found.");
    }

    if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new PaymentError(
        "payment-not-refundable",
        "Only a successful payment can be refunded.",
      );
    }

    if (!payment.providerPaymentId) {
      throw new PaymentError(
        "payment-not-refundable",
        "This payment has no LynxPay reference, so it cannot be refunded automatically.",
      );
    }

    const existing = await transaction.refund.aggregate({
      where: { paymentId: payment.id, status: { in: ["PENDING", "SUCCEEDED"] } },
      _sum: { amount: true },
    });
    const existingCents = existing._sum.amount ? decimalToCents(existing._sum.amount) : 0;
    const netCents = decimalToCents(payment.netAmount) || decimalToCents(payment.order.total);
    const remainingCents = netCents - existingCents;

    if (input.amountCents > remainingCents) {
      throw new PaymentError(
        "refund-exceeds-balance",
        `Only ${centsToDecimalString(remainingCents)} is left to refund on this payment.`,
      );
    }

    const refund = await transaction.refund.create({
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        amount: centsToDecimalString(input.amountCents),
        currency: payment.currency,
        reason: input.reason,
        status: "PENDING",
        requestedById: input.adminId,
      },
      select: { id: true },
    });

    return {
      refundId: refund.id,
      paymentId: payment.id,
      providerPaymentId: payment.providerPaymentId,
      orderNumber: payment.order.orderNumber,
      amountCents: input.amountCents,
      reason: input.reason,
    };
  });
}

async function failRefund(
  database: PrismaClient,
  refund: PreparedRefund,
  message: string,
): Promise<void> {
  try {
    await database.refund.update({
      where: { id: refund.refundId },
      data: {
        status: "FAILED",
        failureMessage: truncate(message, 500),
        processedAt: new Date(),
      },
    });
  } catch (error) {
    logger.warn("payment.refund_failure_not_recorded", {
      refundId: refund.refundId,
      error,
    });
  }
}

interface FinalizeRefundInput {
  refundId: string;
  providerRefundId: string | null;
}

async function finalizeRefund(
  database: PrismaClient,
  input: FinalizeRefundInput,
): Promise<RefundPaymentResult> {
  return database.$transaction(async (transaction) => {
    const selected = await transaction.refund.findUnique({
      where: { id: input.refundId },
      select: { id: true, paymentId: true, orderId: true },
    });

    if (!selected) {
      throw new PaymentError("payment-not-found", "That refund could not be found.");
    }

    await transaction.$queryRaw`
      SELECT "id" FROM "refunds" WHERE "id" = ${selected.id}::uuid FOR UPDATE
    `;
    await lockPayment(transaction, selected.paymentId);
    await lockOrder(transaction, selected.orderId);

    const refund = await transaction.refund.findUnique({
      where: { id: selected.id },
      include: {
        payment: true,
        order: { select: { orderNumber: true, total: true } },
      },
    });

    if (!refund) {
      throw new PaymentError("payment-not-found", "That refund could not be found.");
    }

    if (refund.status === "SUCCEEDED") {
      const totalRefunded = await transaction.refund.aggregate({
        where: { paymentId: refund.paymentId, status: "SUCCEEDED" },
        _sum: { amount: true },
      });
      const refundedCents = totalRefunded._sum.amount
        ? decimalToCents(totalRefunded._sum.amount)
        : 0;

      return {
        refundId: refund.id,
        status: "SUCCEEDED",
        paymentStatus: refund.payment.status,
        refundedCents,
      };
    }

    if (refund.status === "FAILED") {
      throw new PaymentError("invalid-request", "This refund already failed.");
    }

    const refundCents = decimalToCents(refund.amount);
    const ledgerEntries = await transaction.commissionLedger.findMany({
      where: { paymentId: refund.paymentId },
      select: {
        refundId: true,
        type: true,
        amount: true,
        vendorOrderId: true,
        vendorId: true,
      },
    });

    const allocations = new Map<
      string,
      {
        vendorOrderId: string;
        vendorId: string;
        earningCents: number;
        commissionCents: number;
        reversedEarningCents: number;
        reversedCommissionCents: number;
      }
    >();

    for (const entry of ledgerEntries) {
      if (!entry.vendorOrderId || !entry.vendorId) {
        continue;
      }

      if (entry.type !== "VENDOR_EARNING" && entry.type !== "PLATFORM_COMMISSION") {
        continue;
      }

      const amountCents = decimalToCents(entry.amount);
      const bucket = allocations.get(entry.vendorOrderId) ?? {
        vendorOrderId: entry.vendorOrderId,
        vendorId: entry.vendorId,
        earningCents: 0,
        commissionCents: 0,
        reversedEarningCents: 0,
        reversedCommissionCents: 0,
      };

      if (entry.refundId === null && amountCents >= 0) {
        if (entry.type === "VENDOR_EARNING") {
          bucket.earningCents += amountCents;
        } else {
          bucket.commissionCents += amountCents;
        }
      } else if (entry.refundId !== null) {
        if (entry.type === "VENDOR_EARNING") {
          bucket.reversedEarningCents += Math.abs(amountCents);
        } else {
          bucket.reversedCommissionCents += Math.abs(amountCents);
        }
      }

      allocations.set(entry.vendorOrderId, bucket);
    }

    const remaining: CommissionAllocation[] = [...allocations.values()]
      .map((bucket) => ({
        vendorOrderId: bucket.vendorOrderId,
        vendorId: bucket.vendorId,
        subtotalCents:
          bucket.earningCents +
          bucket.commissionCents -
          bucket.reversedEarningCents -
          bucket.reversedCommissionCents,
        earningCents: bucket.earningCents - bucket.reversedEarningCents,
        commissionCents: bucket.commissionCents - bucket.reversedCommissionCents,
      }))
      .filter((allocation) => allocation.subtotalCents > 0);

    const remainingTotal = remaining.reduce(
      (total, allocation) => total + allocation.subtotalCents,
      0,
    );

    if (refundCents > remainingTotal) {
      throw new LedgerIntegrityError(
        "The local commission ledger does not hold enough balance for this refund.",
      );
    }

    const split = allocateRefund(remaining, refundCents);
    const reversals: Prisma.CommissionLedgerCreateManyInput[] = [];

    for (const allocation of remaining) {
      const vendorRefund = split.get(allocation.vendorOrderId) ?? 0;

      if (vendorRefund <= 0) {
        continue;
      }

      const reversed = reverseCommission(allocation, vendorRefund);

      if (reversed.earningReversalCents > 0) {
        reversals.push({
          entryKey: `refund:${refund.id}:vo:${allocation.vendorOrderId}:earning`,
          refundId: refund.id,
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          vendorOrderId: allocation.vendorOrderId,
          vendorId: allocation.vendorId,
          type: "VENDOR_EARNING",
          amount: centsToSignedDecimalString(-reversed.earningReversalCents),
          currency: refund.currency,
        });
      }

      if (reversed.commissionReversalCents > 0) {
        reversals.push({
          entryKey: `refund:${refund.id}:vo:${allocation.vendorOrderId}:commission`,
          refundId: refund.id,
          paymentId: refund.paymentId,
          orderId: refund.orderId,
          vendorOrderId: allocation.vendorOrderId,
          vendorId: allocation.vendorId,
          type: "PLATFORM_COMMISSION",
          amount: centsToSignedDecimalString(-reversed.commissionReversalCents),
          currency: refund.currency,
        });
      }
    }

    if (reversals.length > 0) {
      await transaction.commissionLedger.createMany({
        data: reversals,
        skipDuplicates: true,
      });
    }

    await transaction.refund.update({
      where: { id: refund.id },
      data: {
        status: "SUCCEEDED",
        providerRefundId: input.providerRefundId,
        processedAt: new Date(),
        failureMessage: null,
      },
    });

    const total = await transaction.refund.aggregate({
      where: { paymentId: refund.paymentId, status: "SUCCEEDED" },
      _sum: { amount: true },
    });
    const refundedCents = total._sum.amount ? decimalToCents(total._sum.amount) : 0;
    const netCents = decimalToCents(refund.payment.netAmount) || decimalToCents(refund.order.total);
    const paymentStatus: PaymentStatus =
      refundedCents >= netCents ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await transaction.payment.update({
      where: { id: refund.paymentId },
      data: { status: paymentStatus },
    });

    await recordAuditEvent(transaction, {
      actorId: refund.requestedById,
      action: "PAYMENT_REFUNDED",
      targetType: "order",
      targetId: refund.orderId,
      metadata: {
        orderNumber: refund.order.orderNumber,
        paymentId: refund.paymentId,
        refundId: refund.id,
        amountCents: refundCents,
        refundedCents,
      },
    });

    logger.info("payment.refunded", {
      orderNumber: refund.order.orderNumber,
      paymentId: refund.paymentId,
      refundId: refund.id,
      amountCents: refundCents,
    });

    return {
      refundId: refund.id,
      status: "SUCCEEDED",
      paymentStatus,
      refundedCents,
    };
  });
}

export async function refundPayment(
  database: PrismaClient,
  gateway: PaymentGateway,
  input: RefundPaymentInput,
): Promise<RefundPaymentResult> {
  const prepared = await prepareRefund(database, input);
  let providerResult: { providerRefundId: string | null; status: string | null };

  try {
    providerResult = await gateway.refundPayment(
      prepared.providerPaymentId,
      prepared.amountCents,
      prepared.reason,
    );
  } catch (error) {
    await failRefund(
      database,
      prepared,
      "LynxPay did not confirm this refund. Reconcile the provider dashboard before retrying.",
    );

    logger.warn("payment.refund_failed", {
      refundId: prepared.refundId,
      code: error instanceof LynxPayRequestError ? error.code : "UNKNOWN",
    });

    throw new PaymentError(
      "gateway-unavailable",
      "LynxPay did not confirm the refund. Check the provider dashboard before trying again.",
    );
  }

  const providerStatus = providerResult.status?.toLowerCase() ?? "";

  if (providerStatus.includes("fail") || providerStatus === "declined") {
    await failRefund(database, prepared, "LynxPay rejected the refund.");
    throw new PaymentError("provider-error", "LynxPay rejected this refund.");
  }

  try {
    return await finalizeRefund(database, {
      refundId: prepared.refundId,
      providerRefundId: providerResult.providerRefundId,
    });
  } catch (error) {
    if (error instanceof LedgerIntegrityError) {
      await failRefund(database, prepared, error.message);
      throw new PaymentError(
        "provider-error",
        "The refund was sent to LynxPay but the local ledger needs reconciliation. Contact support.",
      );
    }

    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Payouts                                                                     */
/* -------------------------------------------------------------------------- */

export interface VendorBalance {
  earningsCents: number;
  reservedCents: number;
  paidOutCents: number;
  availableCents: number;
}

async function vendorBalance(
  client: Prisma.TransactionClient,
  vendorId: string,
  currency: string,
): Promise<VendorBalance> {
  const earnings = await client.commissionLedger.aggregate({
    where: { vendorId, type: "VENDOR_EARNING", currency },
    _sum: { amount: true },
  });
  const held = await client.payout.aggregate({
    where: {
      vendorId,
      currency,
      status: { in: ["PENDING", "APPROVED", "PROCESSING"] },
    },
    _sum: { amount: true },
  });
  const paidOut = await client.payout.aggregate({
    where: { vendorId, currency, status: { in: ["PAID", "RECONCILED"] } },
    _sum: { amount: true },
  });
  const earningsCents = earnings._sum.amount ? decimalToCents(earnings._sum.amount) : 0;
  const reservedCents = held._sum.amount ? decimalToCents(held._sum.amount) : 0;
  const paidOutCents = paidOut._sum.amount ? decimalToCents(paidOut._sum.amount) : 0;

  return {
    earningsCents,
    reservedCents,
    paidOutCents,
    availableCents: earningsCents - reservedCents - paidOutCents,
  };
}

export async function getVendorBalance(
  database: PrismaClient,
  vendorId: string,
  currency = DEFAULT_CURRENCY,
): Promise<VendorBalance> {
  return vendorBalance(database, vendorId, currency);
}

function createPayoutReference(): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return `PO-${date}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export interface CreatePayoutInput {
  vendorId: string;
  amountCents: number;
  periodStart: Date;
  periodEnd: Date;
  note: string | null;
  adminId: string;
}

export interface CreatedPayout {
  id: string;
  reference: string;
  amountCents: number;
  currency: string;
}

export async function createPayout(
  database: PrismaClient,
  input: CreatePayoutInput,
): Promise<CreatedPayout> {
  if (input.amountCents <= 0) {
    throw new PaymentError("amount-invalid", "Enter a positive payout amount.");
  }

  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT "id" FROM "vendors" WHERE "id" = ${input.vendorId}::uuid FOR UPDATE
    `;

    const vendor = await transaction.vendor.findUnique({
      where: { id: input.vendorId },
      select: { id: true, name: true },
    });

    if (!vendor) {
      throw new PaymentError("vendor-not-found", "That studio could not be found.");
    }

    const balance = await vendorBalance(transaction, vendor.id, DEFAULT_CURRENCY);

    if (input.amountCents > balance.availableCents) {
      throw new PaymentError(
        "balance-insufficient",
        `This studio only has ${formatCents(balance.availableCents)} available to pay out.`,
      );
    }

    let payout: { id: string; reference: string | null; amount: Prisma.Decimal } | null = null;

    for (let attempt = 0; attempt < 3 && !payout; attempt += 1) {
      try {
        payout = await transaction.payout.create({
          data: {
            vendorId: vendor.id,
            status: "PENDING",
            amount: centsToDecimalString(input.amountCents),
            currency: DEFAULT_CURRENCY,
            reference: createPayoutReference(),
            note: input.note,
            periodStart: input.periodStart,
            periodEnd: input.periodEnd,
            createdById: input.adminId,
          },
          select: { id: true, reference: true, amount: true },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002" &&
          attempt < 2
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!payout) {
      throw new PaymentError("invalid-request", "A payout reference could not be generated.");
    }

    await recordAuditEvent(transaction, {
      actorId: input.adminId,
      action: "PAYOUT_CREATED",
      targetType: "payout",
      targetId: payout.id,
      metadata: {
        vendorId: vendor.id,
        amountCents: input.amountCents,
        reference: payout.reference,
      },
    });

    return {
      id: payout.id,
      reference: payout.reference ?? "",
      amountCents: decimalToCents(payout.amount),
      currency: DEFAULT_CURRENCY,
    };
  });
}

function formatCents(cents: number): string {
  return `${centsToDecimalString(Math.max(cents, 0))} ${DEFAULT_CURRENCY}`;
}

export async function markPayoutPaid(
  database: PrismaClient,
  payoutId: string,
  adminId: string,
): Promise<void> {
  await database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT "id" FROM "payouts" WHERE "id" = ${payoutId}::uuid FOR UPDATE
    `;

    const payout = await transaction.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true, vendorId: true },
    });

    if (!payout) {
      throw new PaymentError("payout-not-found", "That payout could not be found.");
    }

    if (payout.status === "PAID" || payout.status === "RECONCILED") {
      return;
    }

    if (payout.status === "FAILED") {
      throw new PaymentError("payout-transition-invalid", "A failed payout cannot be marked paid.");
    }

    await transaction.payout.update({
      where: { id: payout.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        approvedAt: payout.status === "PENDING" ? new Date() : undefined,
      },
    });

    await recordAuditEvent(transaction, {
      actorId: adminId,
      action: "PAYOUT_PAID",
      targetType: "payout",
      targetId: payout.id,
      metadata: { vendorId: payout.vendorId },
    });
  });
}

export async function reconcilePayout(
  database: PrismaClient,
  payoutId: string,
  adminId: string,
): Promise<void> {
  await database.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT "id" FROM "payouts" WHERE "id" = ${payoutId}::uuid FOR UPDATE
    `;

    const payout = await transaction.payout.findUnique({
      where: { id: payoutId },
      select: { id: true, status: true, vendorId: true },
    });

    if (!payout) {
      throw new PaymentError("payout-not-found", "That payout could not be found.");
    }

    if (payout.status === "RECONCILED") {
      return;
    }

    if (payout.status !== "PAID") {
      throw new PaymentError("payout-transition-invalid", "Only a paid payout can be reconciled.");
    }

    await transaction.payout.update({
      where: { id: payout.id },
      data: { status: "RECONCILED", reconciledAt: new Date() },
    });

    await recordAuditEvent(transaction, {
      actorId: adminId,
      action: "PAYOUT_RECONCILED",
      targetType: "payout",
      targetId: payout.id,
      metadata: { vendorId: payout.vendorId },
    });
  });
}

export function usesMobileMoney(method: string): boolean {
  return MOBILE_METHODS.has(method);
}
