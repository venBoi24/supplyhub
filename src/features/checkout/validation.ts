import { z } from "zod";

import { emailField } from "@/features/identity/validation";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(max, { error: `Use ${max} characters or fewer.` })
      .optional(),
  );

export const checkoutAddressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, { error: "Enter the recipient's full name." })
    .max(80, { error: "Use 80 characters or fewer." }),
  contactEmail: emailField,
  contactPhone: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .max(30, { error: "Use 30 characters or fewer." })
      .regex(/^[0-9+()\-.\s]+$/, { error: "Use digits, spaces, and + ( ) - . only." })
      .optional(),
  ),
  addressLine1: z
    .string()
    .trim()
    .min(3, { error: "Enter a street address." })
    .max(120, { error: "Use 120 characters or fewer." }),
  addressLine2: optionalText(120),
  city: z
    .string()
    .trim()
    .min(1, { error: "Enter a city." })
    .max(80, { error: "Use 80 characters or fewer." }),
  region: z
    .string()
    .trim()
    .min(1, { error: "Enter a state, region, or province." })
    .max(80, { error: "Use 80 characters or fewer." }),
  postalCode: z
    .string()
    .trim()
    .min(2, { error: "Enter a postal code." })
    .max(16, { error: "Use 16 characters or fewer." })
    .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, { error: "Use letters, numbers, spaces, and hyphens." }),
  countryCode: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : value),
    z.string().regex(/^[A-Z]{2}$/, { error: "Use a two-letter country code." }),
  ),
});

export type CheckoutAddressInput = z.infer<typeof checkoutAddressSchema>;
