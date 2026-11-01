import "server-only";

import type { PrismaClient } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { logger } from "@/lib/logging/logger";
import type { GatewayPayment } from "@/server/payments/types";

import { applyProviderPayment, type ApplyProviderPaymentResult } from "./service";

export interface RecordedPaymentEvent {
  outcome: ApplyProviderPaymentResult["outcome"];
  duplicate: boolean;
  paymentId: string | null;
  orderNumber: string | null;
}

function eventPaymentStatus(status: GatewayPayment["status"]): PaymentStatus {
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

/**
 * Store only the fields needed to explain a decision. Customer phone numbers and any
 * unexpected provider data are deliberately excluded from the event record.
 */
export function sanitizePaymentPayload(payment: GatewayPayment): Prisma.InputJsonValue {
  return {
    id: payment.providerPaymentId,
    external_id: payment.externalId,
    amount: payment.amountMinor,
    fee_amount: payment.feeMinor,
    net_amount: payment.netMinor,
    currency: payment.currency,
    status: payment.status,
    payment_method: payment.paymentMethod,
    provider_reference: payment.providerReference,
    failure_reason: payment.failureReason,
    completed_at: payment.completedAt?.toISOString() ?? null,
  };
}

export async function recordAndApplyPaymentEvent(
  database: PrismaClient,
  input: {
    payment: GatewayPayment;
    eventType: string;
    deliveryId: string;
  },
): Promise<RecordedPaymentEvent> {
  const payload = sanitizePaymentPayload(input.payment);
  let event: { id: string; outcome: string; processedAt: Date | null } | null = null;
  let duplicate = false;

  try {
    event = await database.paymentEvent.create({
      data: {
        provider: "LYNXPAY",
        deliveryId: input.deliveryId,
        eventType: input.eventType.slice(0, 64),
        providerPaymentId: input.payment.providerPaymentId,
        externalId: input.payment.externalId,
        status: eventPaymentStatus(input.payment.status),
        outcome: "IGNORED",
        payload,
      },
      select: { id: true, outcome: true, processedAt: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      duplicate = true;
      event = await database.paymentEvent.findUnique({
        where: {
          provider_deliveryId: {
            provider: "LYNXPAY",
            deliveryId: input.deliveryId,
          },
        },
        select: { id: true, outcome: true, processedAt: true },
      });

      if (
        event &&
        (event.outcome === "APPLIED" ||
          event.outcome === "DUPLICATE" ||
          event.outcome === "MISMATCH" ||
          event.outcome === "UNKNOWN_ORDER") &&
        event.processedAt
      ) {
        return {
          outcome: "DUPLICATE",
          duplicate: true,
          paymentId: null,
          orderNumber: input.payment.externalId,
        };
      }
    } else {
      throw error;
    }
  }

  if (!event) {
    throw new Error("The payment event could not be recorded.");
  }

  let result: ApplyProviderPaymentResult;

  try {
    result = await applyProviderPayment(database, {
      payment: input.payment,
      eventType: input.eventType,
    });
  } catch (error) {
    logger.error("payment.webhook_apply_failed", {
      deliveryId: input.deliveryId,
      providerPaymentId: input.payment.providerPaymentId,
      error,
    });

    await database.paymentEvent
      .update({
        where: { id: event.id },
        data: {
          outcome: "ERROR",
          processedAt: new Date(),
          errorMessage: "The event could not be applied. It will be retried.",
        },
      })
      .catch(() => undefined);

    throw error;
  }

  await database.paymentEvent.update({
    where: { id: event.id },
    data: {
      outcome: result.outcome,
      processedAt: new Date(),
      errorMessage: result.reason ? result.reason.slice(0, 500) : null,
    },
  });

  return {
    outcome: result.outcome,
    duplicate,
    paymentId: result.paymentId,
    orderNumber: result.orderNumber,
  };
}
