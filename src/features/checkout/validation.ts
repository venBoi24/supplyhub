import { z } from "zod";

import { createEmailField } from "@/features/identity/validation";
import { defaultTranslator, type Translator } from "@/i18n/dictionary";

const createOptionalText = (t: Translator, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(max, { error: t("validation.maxCharacters", { max }) })
      .optional(),
  );

export const createCheckoutAddressSchema = (t: Translator) =>
  z
    .object({
      recipientName: z
        .string()
        .trim()
        .min(2, { error: t("validation.recipientNameRequired") })
        .max(80, { error: t("validation.maxCharacters", { max: 80 }) }),
      contactEmail: createEmailField(t),
      contactPhone: z.preprocess(
        (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
        z
          .string()
          .trim()
          .max(30, { error: t("validation.maxCharacters", { max: 30 }) })
          .regex(/^[0-9+()\-.\s]+$/, { error: t("validation.phoneCharacters") })
          .optional(),
      ),
      addressLine1: z
        .string()
        .trim()
        .min(3, { error: t("validation.streetAddressRequired") })
        .max(120, { error: t("validation.maxCharacters", { max: 120 }) }),
      addressLine2: createOptionalText(t, 120),
      city: z
        .string()
        .trim()
        .min(1, { error: t("validation.cityRequiredShort") })
        .max(80, { error: t("validation.maxCharacters", { max: 80 }) }),
      region: z
        .string()
        .trim()
        .min(1, { error: t("validation.regionRequired") })
        .max(80, { error: t("validation.maxCharacters", { max: 80 }) }),
      postalCode: z
        .string()
        .trim()
        .min(2, { error: t("validation.postalCodeRequired") })
        .max(16, { error: t("validation.maxCharacters", { max: 16 }) })
        .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, {
          error: t("validation.postalCodeFormat"),
        }),
      countryCode: z.preprocess(
        (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
        z.string().regex(/^[A-Z]{2}$/, { error: t("validation.countryCodeFormat") }),
      ),
      deliveryMethod: z.enum(["PICKUP", "DELIVERY"]).default("PICKUP"),
      customerLatitude: z.preprocess(
        (value) =>
          value === "" || value === null || value === undefined ? undefined : Number(value),
        z.number().min(-90).max(90).optional(),
      ),
      customerLongitude: z.preprocess(
        (value) =>
          value === "" || value === null || value === undefined ? undefined : Number(value),
        z.number().min(-180).max(180).optional(),
      ),
    })
    .superRefine((value, context) => {
      if (value.deliveryMethod === "DELIVERY") {
        if (value.customerLatitude === undefined || value.customerLongitude === undefined) {
          context.addIssue({
            code: "custom",
            path: ["deliveryMethod"],
            message: t("validation.deliveryLocationRequired"),
          });
        }
      }
    });

export const checkoutAddressSchema = createCheckoutAddressSchema(defaultTranslator);

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
