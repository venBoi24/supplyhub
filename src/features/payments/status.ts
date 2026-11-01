import type { PaymentStatus, PayoutStatus, RefundStatus } from "@/generated/prisma/enums";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Starting",
  PROCESSING: "Awaiting confirmation",
  SUCCEEDED: "Paid",
  FAILED: "Failed",
  EXPIRED: "Expired",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
  DISPUTED: "Needs review",
};

export const PAYMENT_STATUS_TONES: Record<
  PaymentStatus,
  "neutral" | "accent" | "clay" | "success" | "danger"
> = {
  PENDING: "clay",
  PROCESSING: "accent",
  SUCCEEDED: "success",
  FAILED: "danger",
  EXPIRED: "neutral",
  REFUNDED: "neutral",
  PARTIALLY_REFUNDED: "clay",
  DISPUTED: "danger",
};

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  PENDING: "Pending",
  SUCCEEDED: "Refunded",
  FAILED: "Failed",
};

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  PROCESSING: "Processing",
  PAID: "Paid",
  RECONCILED: "Reconciled",
  FAILED: "Failed",
};

export const PAYOUT_STATUS_TONES: Record<
  PayoutStatus,
  "neutral" | "accent" | "clay" | "success" | "danger"
> = {
  PENDING: "clay",
  APPROVED: "accent",
  PROCESSING: "accent",
  PAID: "success",
  RECONCILED: "success",
  FAILED: "danger",
};
