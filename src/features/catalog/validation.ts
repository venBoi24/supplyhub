import { z } from "zod";

import { defaultTranslator, type Translator } from "@/i18n/dictionary";
import { createPhoneNumberSchema } from "@/features/identity/validation";

import { MAX_UNIT_STOCK } from "./inventory";
import { MAX_PRICE_CENTS, parseMoneyToCents } from "./money";

const trimmed = (value: unknown) => (typeof value === "string" ? value.trim() : value);

/**
 * Schema factories take a translator so server actions can emit field errors in
 * the visitor's selected locale. The module-level `*Schema` consts below are the
 * same factories bound to English for consumers that are not request-scoped.
 */
const createSlugField = (t: Translator) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z
      .string({ error: t("validation.handleRequired") })
      .min(3, { error: t("validation.minCharacters", { min: 3 }) })
      .max(72, { error: t("validation.maxCharacters", { max: 72 }) })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: t("validation.slugFormat"),
      }),
  );

const createSkuField = (t: Translator) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z
      .string({ error: t("validation.skuRequired") })
      .min(3, { error: t("validation.minCharacters", { min: 3 }) })
      .max(32, { error: t("validation.maxCharacters", { max: 32 }) })
      .regex(/^[A-Z0-9][A-Z0-9-]*$/, {
        error: t("validation.skuFormat"),
      }),
  );

const createPriceField = (t: Translator) =>
  z.preprocess(
    (value) => (typeof value === "string" ? parseMoneyToCents(value) : value),
    z
      .number({ error: t("validation.priceRequired") })
      .int({ error: t("validation.priceWholeCents") })
      .min(1, { error: t("validation.pricePositive") })
      .max(MAX_PRICE_CENTS, { error: t("validation.priceTooLarge") }),
  );

const createOptionalPriceField = (t: Translator) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string" || value.trim() === "") return undefined;
      return parseMoneyToCents(value);
    },
    z
      .number({ error: t("validation.compareAtPriceRequired") })
      .int()
      .min(1, { error: t("validation.compareAtPricePositive") })
      .max(MAX_PRICE_CENTS, { error: t("validation.priceTooLarge") })
      .optional(),
  );

const createWholeNumberField = (t: Translator, minimum: number, maximum: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() !== "" ? Number(value) : value),
    z
      .number({ error: message })
      .int({ error: t("validation.wholeNumber") })
      .min(minimum)
      .max(maximum),
  );

const createMaterialsField = (t: Translator) =>
  z.preprocess(
    (value) => {
      if (typeof value !== "string") return [];
      return value
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    },
    z
      .array(
        z
          .string()
          .min(1)
          .max(60, { error: t("validation.materialTooLong", { max: 60 }) }),
      )
      .max(12, { error: t("validation.materialCount", { max: 12 }) }),
  );

export const createProductInputSchema = (t: Translator) =>
  z
    .object({
      name: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.objectNameRequired") })
          .min(2, { error: t("validation.minCharacters", { min: 2 }) })
          .max(120, { error: t("validation.maxCharacters", { max: 120 }) }),
      ),
      slug: createSlugField(t),
      categoryId: z.uuid({ error: t("validation.chooseDepartment") }),
      sku: createSkuField(t),
      priceCents: createPriceField(t),
      compareAtPriceCents: createOptionalPriceField(t),
      summary: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.summaryRequired") })
          .min(10, { error: t("validation.minCharacters", { min: 10 }) })
          .max(280, { error: t("validation.maxCharacters", { max: 280 }) }),
      ),
      description: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.descriptionRequired") })
          .min(20, { error: t("validation.minCharacters", { min: 20 }) })
          .max(4000, { error: t("validation.maxCharacters", { max: 4000 }) }),
      ),
      makerNote: z.preprocess(
        trimmed,
        z
          .string()
          .max(600, { error: t("validation.maxCharacters", { max: 600 }) })
          .default(""),
      ),
      materials: createMaterialsField(t),
      dimensions: z.preprocess(
        trimmed,
        z
          .string()
          .max(160, { error: t("validation.maxCharacters", { max: 160 }) })
          .default(""),
      ),
      care: z.preprocess(
        trimmed,
        z
          .string()
          .max(400, { error: t("validation.maxCharacters", { max: 400 }) })
          .default(""),
      ),
      initialStock: z.preprocess(
        (value) => (value === "" || value === undefined || value === null ? 0 : Number(value)),
        z
          .number({ error: t("validation.wholeUnits") })
          .int({ error: t("validation.wholeUnits") })
          .min(0, { error: t("validation.stockNotNegative") })
          .max(MAX_UNIT_STOCK, {
            error: t("validation.stockMax", { max: MAX_UNIT_STOCK }),
          }),
      ),
    })
    .superRefine((value, context) => {
      if (
        value.compareAtPriceCents !== undefined &&
        value.compareAtPriceCents <= value.priceCents
      ) {
        context.addIssue({
          code: "custom",
          path: ["compareAtPriceCents"],
          message: t("validation.compareAtPriceHigher"),
        });
      }
    });

export const createInventoryAdjustmentSchema = (t: Translator) =>
  z
    .object({
      productId: z.uuid({ error: t("validation.objectReferenceInvalid") }),
      mode: z.enum(["add", "set"], { error: t("validation.chooseStockMode") }),
      quantity: createWholeNumberField(t, 0, MAX_UNIT_STOCK, t("validation.wholeUnits")),
      reason: z.enum(["RESTOCK", "CORRECTION", "RETURN"], {
        error: t("validation.chooseStockReason"),
      }),
      note: z.preprocess(
        trimmed,
        z
          .string()
          .max(200, { error: t("validation.maxCharacters", { max: 200 }) })
          .default(""),
      ),
    })
    .superRefine((value, context) => {
      if (value.mode === "add" && value.quantity < 1) {
        context.addIssue({
          code: "custom",
          path: ["quantity"],
          message: t("validation.addAtLeastOneUnit"),
        });
      }
    });

export const createStudioProfileSchema = (t: Translator) =>
  z
    .object({
      contactPhone: createPhoneNumberSchema(t),
      departmentIds: z
        .array(z.uuid())
        .min(1, { error: t("validation.chooseDepartment") })
        .max(20),
      city: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.cityRequired") })
          .min(2, { error: t("validation.minCharacters", { min: 2 }) })
          .max(80, { error: t("validation.maxCharacters", { max: 80 }) }),
      ),
      street: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.streetRequired") })
          .min(2)
          .max(120),
      ),
      address: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.addressRequired") })
          .min(2)
          .max(160),
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
          .string({ error: t("validation.disciplineRequired") })
          .min(2, { error: t("validation.minCharacters", { min: 2 }) })
          .max(60, { error: t("validation.maxCharacters", { max: 60 }) }),
      ),
      story: z.preprocess(
        trimmed,
        z
          .string({ error: t("validation.studioStoryRequired") })
          .min(20, { error: t("validation.minCharacters", { min: 20 }) })
          .max(1000, { error: t("validation.maxCharacters", { max: 1000 }) }),
      ),
      monogram: z.preprocess(
        (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
        z
          .string()
          .max(3, { error: t("validation.monogramMax", { max: 3 }) })
          .regex(/^[A-Z]{0,3}$/, { error: t("validation.monogramLetters") })
          .default(""),
      ),
    })
    .superRefine((value, context) => {
      if ((value.latitude === null) !== (value.longitude === null)) {
        context.addIssue({
          code: "custom",
          path: [value.latitude === null ? "latitude" : "longitude"],
          message: t("validation.mapCoordinatesPair"),
        });
      }
    });

export const createCategoryInputSchema = (t: Translator) =>
  z.object({
    name: z.preprocess(
      trimmed,
      z
        .string({ error: t("validation.departmentNameRequired") })
        .min(2, { error: t("validation.minCharacters", { min: 2 }) })
        .max(60, { error: t("validation.maxCharacters", { max: 60 }) }),
    ),
    slug: createSlugField(t),
    headline: z.preprocess(
      trimmed,
      z
        .string()
        .max(120, { error: t("validation.maxCharacters", { max: 120 }) })
        .default(""),
    ),
    description: z.preprocess(
      trimmed,
      z
        .string()
        .max(600, { error: t("validation.maxCharacters", { max: 600 }) })
        .default(""),
    ),
  });

export const createProductModerationSchema = (t: Translator) =>
  z
    .object({
      productId: z.uuid({ error: t("validation.objectReferenceInvalid") }),
      decision: z.enum(["approve", "reject"], { error: t("validation.chooseModerationDecision") }),
      note: z.preprocess(
        trimmed,
        z
          .string()
          .max(500, { error: t("validation.maxCharacters", { max: 500 }) })
          .default(""),
      ),
    })
    .superRefine((value, context) => {
      if (value.decision === "reject" && value.note.length < 3) {
        context.addIssue({
          code: "custom",
          path: ["note"],
          message: t("validation.explainDecisionToStudio"),
        });
      }
    });

export const createProductFeatureSchema = (t: Translator) =>
  z.object({
    productId: z.uuid({ error: t("validation.objectReferenceInvalid") }),
    featured: z.enum(["1", "0"]),
  });

export const productInputSchema = createProductInputSchema(defaultTranslator);
export const inventoryAdjustmentSchema = createInventoryAdjustmentSchema(defaultTranslator);
export const studioProfileSchema = createStudioProfileSchema(defaultTranslator);
export const categoryInputSchema = createCategoryInputSchema(defaultTranslator);
export const productModerationSchema = createProductModerationSchema(defaultTranslator);
export const productFeatureSchema = createProductFeatureSchema(defaultTranslator);

export type ProductInput = z.infer<typeof productInputSchema>;
export type InventoryAdjustmentInput = z.infer<typeof inventoryAdjustmentSchema>;
export type StudioProfileInput = z.infer<typeof studioProfileSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
