import { z } from "zod";
import { phoneNumberSchema } from "@/features/identity/validation";

import { MAX_UNIT_STOCK } from "./inventory";
import { MAX_PRICE_CENTS, parseMoneyToCents } from "./money";

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : value);

const slugField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
  z
    .string({ error: "Enter a handle." })
    .min(3, { error: "Use at least 3 characters." })
    .max(72, { error: "Use 72 characters or fewer." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error: "Use lowercase letters, numbers, and single hyphens.",
    }),
);

const skuField = z.preprocess(
  (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
  z
    .string({ error: "Enter a SKU." })
    .min(3, { error: "Use at least 3 characters." })
    .max(32, { error: "Use 32 characters or fewer." })
    .regex(/^[A-Z0-9][A-Z0-9-]*$/, {
      error: "Use uppercase letters, numbers, and hyphens.",
    }),
);

const priceField = z.preprocess(
  (value) => (typeof value === "string" ? parseMoneyToCents(value) : value),
  z
    .number({ error: "Enter a price like 68.00." })
    .int({ error: "Prices must resolve to whole cents." })
    .min(1, { error: "Price must be greater than zero." })
    .max(MAX_PRICE_CENTS, { error: "That price is too large." }),
);

const optionalPriceField = z.preprocess(
  (value) => {
    if (typeof value !== "string" || value.trim() === "") return undefined;
    return parseMoneyToCents(value);
  },
  z
    .number({ error: "Enter a comparison price like 84.00, or leave it empty." })
    .int()
    .min(1, { error: "Comparison price must be greater than zero." })
    .max(MAX_PRICE_CENTS, { error: "That price is too large." })
    .optional(),
);

const wholeNumberField = (minimum: number, maximum: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z.number({ error: message }).int({ error: "Enter a whole number." }).min(minimum).max(maximum),
  );

const materialsField = z.preprocess(
  (value) => {
    if (typeof value !== "string") return [];
    return value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  },
  z
    .array(z.string().min(1).max(60, { error: "Keep each material under 60 characters." }))
    .max(12, { error: "List 12 materials or fewer." }),
);

export const productInputSchema = z
  .object({
    name: z.preprocess(
      trimmed,
      z
        .string({ error: "Enter an object name." })
        .min(2, { error: "Use at least 2 characters." })
        .max(120, { error: "Use 120 characters or fewer." }),
    ),
    slug: slugField,
    categoryId: z.uuid({ error: "Choose a department." }),
    sku: skuField,
    priceCents: priceField,
    compareAtPriceCents: optionalPriceField,
    summary: z.preprocess(
      trimmed,
      z
        .string({ error: "Write a short summary." })
        .min(10, { error: "Use at least 10 characters." })
        .max(280, { error: "Use 280 characters or fewer." }),
    ),
    description: z.preprocess(
      trimmed,
      z
        .string({ error: "Describe the object." })
        .min(20, { error: "Use at least 20 characters." })
        .max(4000, { error: "Use 4000 characters or fewer." }),
    ),
    makerNote: z.preprocess(
      trimmed,
      z.string().max(600, { error: "Use 600 characters or fewer." }).default(""),
    ),
    materials: materialsField,
    dimensions: z.preprocess(
      trimmed,
      z.string().max(160, { error: "Use 160 characters or fewer." }).default(""),
    ),
    care: z.preprocess(
      trimmed,
      z.string().max(400, { error: "Use 400 characters or fewer." }).default(""),
    ),
    initialStock: z.preprocess(
      (value) => (value === "" || value === undefined || value === null ? 0 : Number(value)),
      z
        .number({ error: "Enter a whole number of units." })
        .int({ error: "Enter a whole number of units." })
        .min(0, { error: "Stock cannot be negative." })
        .max(MAX_UNIT_STOCK, { error: `Stock cannot exceed ${MAX_UNIT_STOCK} units.` }),
    ),
  })
  .superRefine((value, context) => {
    if (value.compareAtPriceCents !== undefined && value.compareAtPriceCents <= value.priceCents) {
      context.addIssue({
        code: "custom",
        path: ["compareAtPriceCents"],
        message: "The comparison price must be higher than the price.",
      });
    }
  });

export const inventoryAdjustmentSchema = z
  .object({
    productId: z.uuid({ error: "That object reference is invalid." }),
    mode: z.enum(["add", "set"], { error: "Choose how to change stock." }),
    quantity: wholeNumberField(0, MAX_UNIT_STOCK, "Enter a whole number of units."),
    reason: z.enum(["RESTOCK", "CORRECTION", "RETURN"], {
      error: "Choose a reason for the change.",
    }),
    note: z.preprocess(
      trimmed,
      z.string().max(200, { error: "Use 200 characters or fewer." }).default(""),
    ),
  })
  .superRefine((value, context) => {
    if (value.mode === "add" && value.quantity < 1) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Add at least one unit.",
      });
    }
  });

export const imageAltSchema = z.preprocess(
  trimmed,
  z
    .string({ error: "Describe the image." })
    .min(3, { error: "Use at least 3 characters." })
    .max(160, { error: "Use 160 characters or fewer." }),
);

export const studioProfileSchema = z
  .object({
    contactPhone: phoneNumberSchema,
    departmentIds: z.array(z.uuid()).min(1, { error: "Choose at least one department." }).max(20),
    city: z.preprocess(
      trimmed,
      z
        .string({ error: "Enter a city or town." })
        .min(2, { error: "Use at least 2 characters." })
        .max(80, { error: "Use 80 characters or fewer." }),
    ),
    street: z.preprocess(trimmed, z.string({ error: "Enter a street." }).min(2).max(120)),
    address: z.preprocess(
      trimmed,
      z.string({ error: "Enter an address or building number." }).min(2).max(160),
    ),
    latitude: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().min(-90).max(90).nullable(),
    ),
    longitude: z.preprocess(
      (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
      z.number().min(-180).max(180).nullable(),
    ),
    discipline: z.preprocess(
      trimmed,
      z
        .string({ error: "Describe your discipline." })
        .min(2, { error: "Use at least 2 characters." })
        .max(60, { error: "Use 60 characters or fewer." }),
    ),
    story: z.preprocess(
      trimmed,
      z
        .string({ error: "Tell customers about your studio." })
        .min(20, { error: "Use at least 20 characters." })
        .max(1000, { error: "Use 1000 characters or fewer." }),
    ),
    monogram: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
      z
        .string()
        .max(3, { error: "Use up to 3 letters." })
        .regex(/^[A-Z]{0,3}$/, { error: "Use letters only." })
        .default(""),
    ),
  })
  .superRefine((value, context) => {
    if ((value.latitude === null) !== (value.longitude === null)) {
      context.addIssue({
        code: "custom",
        path: [value.latitude === null ? "latitude" : "longitude"],
        message: "Use device location to save both map coordinates, or clear both coordinates.",
      });
    }
  });

export const categoryInputSchema = z.object({
  name: z.preprocess(
    trimmed,
    z
      .string({ error: "Enter a department name." })
      .min(2, { error: "Use at least 2 characters." })
      .max(60, { error: "Use 60 characters or fewer." }),
  ),
  slug: slugField,
  headline: z.preprocess(
    trimmed,
    z.string().max(120, { error: "Use 120 characters or fewer." }).default(""),
  ),
  description: z.preprocess(
    trimmed,
    z.string().max(600, { error: "Use 600 characters or fewer." }).default(""),
  ),
});

export const productModerationSchema = z
  .object({
    productId: z.uuid({ error: "That object reference is invalid." }),
    decision: z.enum(["approve", "reject"], { error: "Choose a moderation decision." }),
    note: z.preprocess(
      trimmed,
      z.string().max(500, { error: "Use 500 characters or fewer." }).default(""),
    ),
  })
  .superRefine((value, context) => {
    if (value.decision === "reject" && value.note.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Explain the decision to the studio.",
      });
    }
  });

export const productFeatureSchema = z.object({
  productId: z.uuid({ error: "That object reference is invalid." }),
  featured: z.enum(["1", "0"]),
});

export type ProductInput = z.infer<typeof productInputSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type StudioProfileInput = z.infer<typeof studioProfileSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
