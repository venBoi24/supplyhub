import type { CatalogImage } from "@/features/catalog/types";

export type CartLineProblem = "unavailable" | "insufficient-stock" | "currency-mismatch";

export interface CartLineDraft {
  productId: string;
  slug: string;
  name: string;
  sku: string;
  vendorName: string;
  vendorSlug: string;
  image: CatalogImage | null;
  unitPriceCents: number;
  currency: string;
  quantity: number;
  stock: number;
  purchasable: boolean;
}

export interface CartLine extends CartLineDraft {
  lineTotalCents: number;
  problem: CartLineProblem | null;
  availableQuantity: number;
}

export interface CartView {
  lines: CartLine[];
  itemCount: number;
  subtotalCents: number;
  currency: string;
  hasIssues: boolean;
  canCheckout: boolean;
}
