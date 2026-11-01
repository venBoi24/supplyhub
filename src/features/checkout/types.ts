import type { OrderStatus } from "@/generated/prisma/enums";

export interface PlacedOrder {
  id: string;
  orderNumber: string;
  currency: string;
  totalCents: number;
  itemCount: number;
  vendorCount: number;
  reservationExpiresAt: Date;
}

export interface OrderItemView {
  id: string;
  productName: string;
  productSlug: string;
  sku: string;
  imageSrc: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  currency: string;
}

export interface VendorOrderView {
  id: string;
  vendorName: string;
  vendorSlug: string;
  status: OrderStatus;
  subtotalCents: number;
  items: OrderItemView[];
}

export interface CustomerOrderSummary {
  orderNumber: string;
  status: OrderStatus;
  totalCents: number;
  itemCount: number;
  currency: string;
  placedAt: Date;
  vendorNames: string[];
}

export interface CustomerOrderAddress {
  recipientName: string;
  contactEmail: string;
  contactPhone: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  region: string;
  postalCode: string;
  countryCode: string;
}

export interface CustomerOrderDetail {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  subtotalCents: number;
  shippingTotalCents: number;
  taxTotalCents: number;
  discountTotalCents: number;
  totalCents: number;
  placedAt: Date;
  reservationExpiresAt: Date | null;
  address: CustomerOrderAddress;
  vendorOrders: VendorOrderView[];
}
