import { z } from "zod";

import { ACCOUNT_TOKEN_PATTERN } from "@/lib/security/token-format";

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : value;

export const emailField = z.preprocess(
  normalizeEmail,
  z.email({ error: "Enter a valid email address." }).max(254, {
    error: "Use an email address under 254 characters.",
  }),
);

export const passwordField = z
  .string()
  .min(12, { error: "Use at least 12 characters." })
  .max(128, { error: "Use 128 characters or fewer." });

const nameField = z
  .string()
  .trim()
  .min(2, { error: "Use at least 2 characters." })
  .max(80, { error: "Use 80 characters or fewer." });

const accountTokenField = z
  .string()
  .regex(ACCOUNT_TOKEN_PATTERN, { error: "This link is invalid or incomplete." });

export const signInSchema = z.object({
  email: emailField,
  password: z.string().min(1, { error: "Enter your password." }).max(128),
  next: z.string().max(512).optional(),
});

export const signUpSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match.",
  });

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z
  .object({
    token: accountTokenField,
    password: passwordField,
    confirmPassword: z.string().max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    error: "Passwords do not match.",
  });

export const verifyEmailSchema = z.object({
  token: accountTokenField,
});

export const vendorApplicationSchema = z.object({
  name: nameField,
  slug: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toLowerCase() : value),
    z
      .string()
      .min(3, { error: "Use at least 3 characters." })
      .max(64, { error: "Use 64 characters or fewer." })
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        error: "Use lowercase letters, numbers, and single hyphens.",
      }),
  ),
  description: z
    .string()
    .trim()
    .min(20, { error: "Tell us at least 20 characters about your studio." })
    .max(1000, { error: "Use 1000 characters or fewer." }),
  departmentIds: z.array(z.uuid()).min(1, { error: "Choose at least one department." }).max(20),
});

export const vendorReviewSchema = z
  .object({
    vendorId: z.uuid({ error: "That application reference is invalid." }),
    decision: z.enum(["approve", "reject"]),
    note: z.string().trim().max(500, { error: "Use 500 characters or fewer." }).default(""),
  })
  .superRefine((value, context) => {
    if (value.decision === "reject" && value.note.length < 3) {
      context.addIssue({
        code: "custom",
        path: ["note"],
        message: "Explain the decision to the vendor.",
      });
    }
  });

export const vendorAppealSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(20, {
      error: "Explain why you believe the rejection should be reviewed (at least 20 characters).",
    })
    .max(1000, { error: "Use 1000 characters or fewer." }),
});

export const vendorAppealReviewSchema = z
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
        message: "Add a short reason for declining this appeal.",
      });
    }
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type VendorApplicationInput = z.infer<typeof vendorApplicationSchema>;
export type VendorReviewInput = z.infer<typeof vendorReviewSchema>;
