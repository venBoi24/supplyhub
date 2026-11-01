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
