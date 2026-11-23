import type { PaymentStatus, PayoutStatus, RefundStatus } from "@/generated/prisma/enums";
import { PAYMENT_STATUS_TONES, PAYOUT_STATUS_TONES } from "@/features/payments/status";
import { Badge } from "@/components/ui/badge";
import { getServerI18n } from "@/i18n/server";

const PAYMENT_STATUS_LABEL_KEYS: Record<PaymentStatus, string> = {
  PENDING: "payments.status.paymentStarting",
  PROCESSING: "payments.status.awaitingConfirmation",
  SUCCEEDED: "payments.status.paymentPaid",
  FAILED: "payments.status.paymentFailed",
  EXPIRED: "payments.status.expired",
  REFUNDED: "payments.status.refunded",
  PARTIALLY_REFUNDED: "payments.status.partlyRefunded",
  DISPUTED: "payments.status.needsReview",
};

const REFUND_STATUS_LABEL_KEYS: Record<RefundStatus, string> = {
  PENDING: "payments.status.pending",
  SUCCEEDED: "payments.status.refunded",
  FAILED: "payments.status.paymentFailed",
};

const PAYOUT_STATUS_LABEL_KEYS: Record<PayoutStatus, string> = {
  PENDING: "payments.status.pending",
  APPROVED: "payments.status.approved",
  PROCESSING: "payments.status.processing",
  PAID: "payments.status.paymentPaid",
  RECONCILED: "payments.status.reconciled",
  FAILED: "payments.status.paymentFailed",
};

export async function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { t } = await getServerI18n();
  return <Badge tone={PAYMENT_STATUS_TONES[status]}>{t(PAYMENT_STATUS_LABEL_KEYS[status])}</Badge>;
}

const REFUND_TONES: Record<RefundStatus, "clay" | "success" | "danger"> = {
  PENDING: "clay",
  SUCCEEDED: "success",
  FAILED: "danger",
};

export async function RefundStatusBadge({ status }: { status: RefundStatus }) {
  const { t } = await getServerI18n();
  return <Badge tone={REFUND_TONES[status]}>{t(REFUND_STATUS_LABEL_KEYS[status])}</Badge>;
}

export async function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  const { t } = await getServerI18n();
  return <Badge tone={PAYOUT_STATUS_TONES[status]}>{t(PAYOUT_STATUS_LABEL_KEYS[status])}</Badge>;
}
