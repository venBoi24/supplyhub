import type { OrderStatus } from "@/generated/prisma/enums";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

/**
 * English `ORDER_STATUS_LABELS` stays the source for CSV exports and for
 * enumerating the filter options; rendered UI resolves these keys against the
 * visitor's locale instead.
 */
export const ORDER_STATUS_LABEL_KEYS: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "checkout.status.awaitingPayment",
  PAID: "checkout.status.paid",
  PROCESSING: "checkout.status.processing",
  SHIPPED: "checkout.status.shipped",
  DELIVERED: "checkout.status.delivered",
  CANCELLED: "checkout.status.cancelled",
  EXPIRED: "checkout.status.expired",
};

export const NEXT_VENDOR_ORDER_STATUS = {
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
} as const;

export function nextVendorOrderStatus(status: OrderStatus): OrderStatus | null {
  return NEXT_VENDOR_ORDER_STATUS[status as keyof typeof NEXT_VENDOR_ORDER_STATUS] ?? null;
}

export const ORDER_STATUS_TONES: Record<
  OrderStatus,
  "neutral" | "accent" | "clay" | "success" | "danger"
> = {
  AWAITING_PAYMENT: "clay",
  PAID: "success",
  PROCESSING: "accent",
  SHIPPED: "accent",
  DELIVERED: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
};
