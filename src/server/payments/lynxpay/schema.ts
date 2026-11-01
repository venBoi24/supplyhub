import { z } from "zod";

import type { GatewayPayment, ProviderPaymentStatus } from "@/server/payments/types";

import { fromProviderWholeUnits } from "./amounts";

export const providerStatuses = [
  "processing",
  "completed",
  "failed",
  "expired",
  "refunded",
  "partially_refunded",
  "disputed",
] as const satisfies readonly ProviderPaymentStatus[];

export const lynxPayPaymentSchema = z
  .object({
    id: z.string().min(1),
    external_id: z.string().nullable().optional(),
    amount: z.number().int().nonnegative(),
    fee_amount: z.number().int().nonnegative().optional(),
    net_amount: z.number().int().nonnegative().optional(),
    currency: z.string().length(3),
    status: z.string().min(1),
    payment_method: z.string().nullable().optional(),
    customer_phone: z.string().nullable().optional(),
    provider_reference: z.string().nullable().optional(),
    failure_reason: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    checkout_url: z.string().nullable().optional(),
    redirect_url: z.string().nullable().optional(),
  })
  .passthrough();

export type ProviderPaymentPayload = z.infer<typeof lynxPayPaymentSchema>;

export function parseProviderStatus(value: string): ProviderPaymentStatus | null {
  const normalized = value.toLowerCase();
  return (providerStatuses as readonly string[]).includes(normalized)
    ? (normalized as ProviderPaymentStatus)
    : null;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toGatewayPayment(payment: ProviderPaymentPayload): GatewayPayment {
  const status = parseProviderStatus(payment.status);

  if (!status) {
    throw new Error("LynxPay returned an unknown payment status.");
  }

  const feeMinor = fromProviderWholeUnits(payment.fee_amount ?? 0);
  const amountMinor = fromProviderWholeUnits(payment.amount);
  const netMinor =
    payment.net_amount === undefined
      ? amountMinor - feeMinor
      : fromProviderWholeUnits(payment.net_amount);

  return {
    providerPaymentId: payment.id,
    externalId: payment.external_id ?? null,
    amountMinor,
    feeMinor,
    netMinor,
    currency: payment.currency.toUpperCase(),
    status,
    paymentMethod: payment.payment_method ?? null,
    customerPhone: payment.customer_phone ?? null,
    providerReference: payment.provider_reference ?? null,
    checkoutUrl: payment.checkout_url ?? payment.redirect_url ?? null,
    failureReason: payment.failure_reason ?? null,
    completedAt: parseDate(payment.completed_at),
  };
}

export function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) {
    return null;
  }

  const trimmed = phone.trim();
  return trimmed.length <= 3 ? "***" : `${trimmed.slice(0, -3)}***`;
}
