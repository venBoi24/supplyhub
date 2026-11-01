import type { Availability } from "./types";

export const LOW_STOCK_THRESHOLD = 4;

export const availabilityLabels: Record<Availability, string> = {
  "in-stock": "In stock",
  "low-stock": "Low stock",
  "sold-out": "Sold out",
};

export function getAvailability(inventory: number): Availability {
  if (inventory <= 0) return "sold-out";
  if (inventory <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}
