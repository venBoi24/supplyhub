import type { PaymentStatus, PayoutStatus, RefundStatus } from "@/generated/prisma/enums";
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PAYOUT_STATUS_LABELS,
  PAYOUT_STATUS_TONES,
  REFUND_STATUS_LABELS,
} from "@/features/payments/status";
import { Badge } from "@/components/ui/badge";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={PAYMENT_STATUS_TONES[status]}>{PAYMENT_STATUS_LABELS[status]}</Badge>;
}

const REFUND_TONES: Record<RefundStatus, "clay" | "success" | "danger"> = {
  PENDING: "clay",
  SUCCEEDED: "success",
  FAILED: "danger",
};

export function RefundStatusBadge({ status }: { status: RefundStatus }) {
  return <Badge tone={REFUND_TONES[status]}>{REFUND_STATUS_LABELS[status]}</Badge>;
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge tone={PAYOUT_STATUS_TONES[status]}>{PAYOUT_STATUS_LABELS[status]}</Badge>;
}
