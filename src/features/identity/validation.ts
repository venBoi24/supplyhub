import { z } from "zod";

import { defaultTranslator, type Translator } from "@/i18n/dictionary";
import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

/**
 * Schema factories take a translator so server actions can emit field errors in
 * the visitor's selected locale. The module-level `*Schema` consts below are the
 * same factories bound to English; every consumer that does not yet thread a
 * request locale through keeps importing them unchanged.
 */
export const createEmailField = (t: Translator) =>
  z.preprocess(
    normalizeEmail,
    z
      .email({ error: t("validation.emailInvalid") })
      .max(254, { error: t("validation.emailTooLong") }),
  );

export const createPasswordField = (t: Translator) =>
  z
    .string()
    .min(12, { error: t("validation.minCharacters", { min: 12 }) })
    .max(128, { error: t("validation.maxCharacters", { max: 128 }) });

export const createPhoneNumberSchema = (t: Translator) =>
  z
    .string()
    .trim()
    .min(7, { error: t("validation.phoneWithCountryCode") })
    .max(24, { error: t("validation.maxCharacters", { max: 24 }) })
    .transform((value, context) => {
      const compact = value.replace(/[\s().-]/g, "");
      let digits = compact.replace(/\D/g, "");
      if (!compact.startsWith("+") && digits.startsWith("00")) {
        digits = digits.slice(2);
      } else if (!compact.startsWith("+") && digits.startsWith("0") && digits.length === 10) {
        digits = `255${digits.slice(1)}`;
      }
      if (!/^\d{7,15}$/.test(digits)) {
        context.addIssue({
          code: "custom",
          message: t("validation.phoneDigits"),
        });
        return z.NEVER;
      }
      return `+${digits}`;
    });

const createOptionalPhoneNumberSchema = (t: Translator) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    createPhoneNumberSchema(t).optional(),
  );

const createNameField = (t: Translator) =>
  z
    .string()
    .trim()
    .min(2, { error: t("validation.minCharacters", { min: 2 }) })
    .max(80, { error: t("validation.maxCharacters", { max: 80 }) });

const createAccountTokenField = (t: Translator) =>
  z.string().regex(ACCOUNT_TOKEN_PATTERN, { error: t("validation.linkInvalid") });

export const createSignInSchema = (t: Translator) =>
  z.object({
    email: createEmailField(t),
    password: z
      .string()
      .min(1, { error: t("validation.passwordRequired") })
      .max(128),
    next: z.string().max(512).optional(),
  });

export const createSignUpSchema = (t: Translator) =>
  z
    .object({
      name: createNameField(t),
      email: createEmailField(t),
      phone: createOptionalPhoneNumberSchema(t),
      accountType: z.enum(["BUYER", "SELLER"]),
      password: createPasswordField(t),
      confirmPassword: z.string().max(128),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      error: t("validation.passwordsDoNotMatch"),
    });

export const createForgotPasswordSchema = (t: Translator) =>
  z.object({
    email: createEmailField(t),
  });

export const createResetPasswordSchema = (t: Translator) =>
  z
    .object({
      token: createAccountTokenField(t),
      password: createPasswordField(t),
      confirmPassword: z.string().max(128),
    })
    .refine((value) => value.password === value.confirmPassword, {
      path: ["confirmPassword"],
      error: t("validation.passwordsDoNotMatch"),
    });

export const createVerifyEmailSchema = (t: Translator) =>
  z.object({
    token: createAccountTokenField(t),
  });

export const emailField = createEmailField(defaultTranslator);
export const passwordField = createPasswordField(defaultTranslator);
export const phoneNumberSchema = createPhoneNumberSchema(defaultTranslator);

export const nameField = createNameField(defaultTranslator);

export const signInSchema = createSignInSchema(defaultTranslator);
export const signUpSchema = createSignUpSchema(defaultTranslator);
export const forgotPasswordSchema = createForgotPasswordSchema(defaultTranslator);
export const resetPasswordSchema = createResetPasswordSchema(defaultTranslator);
export const verifyEmailSchema = createVerifyEmailSchema(defaultTranslator);

export const createVendorApplicationSchema = (t: Translator) =>
  z.object({
    name: createNameField(t),
    slug: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
      z
        .string()
        .min(3, { error: t("validation.minCharacters", { min: 3 }) })
        .max(64, { error: t("validation.maxCharacters", { max: 64 }) })
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
          error: t("validation.slugFormat"),
        }),
    ),
    description: z
      .string()
      .trim()
      .min(20, { error: t("validation.studioDescriptionMin", { min: 20 }) })
      .max(1000, { error: t("validation.maxCharacters", { max: 1000 }) }),
    contactPhone: createPhoneNumberSchema(t),
    departmentIds: z
      .array(z.uuid())
      .min(1, { error: t("validation.chooseDepartment") })
      .max(20),
  });

export const createVendorReviewSchema = (t: Translator) =>
  z
    .object({
      vendorId: z.uuid({ error: t("validation.applicationReferenceInvalid") }),
      decision: z.enum(["approve", "reject"]),
      note: z
        .string()
        .trim()
        .max(500, { error: t("validation.maxCharacters", { max: 500 }) })
        .default(""),
    })
    .superRefine((value, context) => {
      if (value.decision === "reject" && value.note.length < 3) {
        context.addIssue({
          code: "custom",
          path: ["note"],
          message: t("validation.explainDecisionToVendor"),
        });
      }
    });

export const createVendorAppealSchema = (t: Translator) =>
  z.object({
    reason: z
      .string()
      .trim()
      .min(20, {
        error: t("validation.appealReasonMin", { min: 20 }),
      })
      .max(1000, { error: t("validation.maxCharacters", { max: 1000 }) }),
  });

export const createVendorAppealReviewSchema = (t: Translator) =>
  z
    .object({
      vendorId: z.uuid(),
      decision: z.enum(["approve", "reject"]),
      note: z.string().trim().max(500).default(""),
    })
    .superRefine((value, context) => {
      if (value.decision === "reject" && value.note.length < 3) {
        context.addIssue({
          code: "custom",
          path: ["note"],
          message: t("validation.declineAppealReason"),
        });
      }
    });

export const vendorApplicationSchema = createVendorApplicationSchema(defaultTranslator);
export const vendorReviewSchema = createVendorReviewSchema(defaultTranslator);
export const vendorAppealSchema = createVendorAppealSchema(defaultTranslator);
export const vendorAppealReviewSchema = createVendorAppealReviewSchema(defaultTranslator);

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;
export type VendorReviewInput = z.infer<typeof vendorReviewSchema>;
