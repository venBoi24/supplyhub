import "server-only";

import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1, "is required")
  .refine(
    (value) => /^postgres(ql)?:\/\/\S+$/i.test(value),
    "must be a PostgreSQL connection string",
  );

const httpUrl = z.string().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}, "must be an absolute http(s) URL");

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional(),
);

const optionalHttpUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  httpUrl.optional(),
);

const booleanFlag = z.preprocess(
  (value) =>
    typeof value === "string" ? ["1", "true", "yes"].includes(value.toLowerCase()) : value,
  z.boolean().default(false),
);

const optionalInteger = (fallback: number, max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().int().min(1).max(max).default(fallback),
  );

const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: postgresUrl,
    NEXT_PUBLIC_SITE_URL: httpUrl.default("http://localhost:3000"),
    AUTH_SECRET: z.string().min(32, "must be at least 32 characters"),
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    S3_ENDPOINT: optionalHttpUrl,
    S3_REGION: optionalText,
    S3_BUCKET: optionalText,
    S3_ACCESS_KEY_ID: optionalText,
    S3_SECRET_ACCESS_KEY: optionalText,
    S3_FORCE_PATH_STYLE: booleanFlag,
    // Configurable default: docs/01-product-vision.md leaves reservation policy unresolved.
    CHECKOUT_RESERVATION_MINUTES: optionalInteger(15, 120),
  })
  .superRefine((value, context) => {
    if (value.STORAGE_DRIVER !== "s3") {
      return;
    }

    const required = [
      "S3_REGION",
      "S3_BUCKET",
      "S3_ACCESS_KEY_ID",
      "S3_SECRET_ACCESS_KEY",
    ] as const;

    for (const key of required) {
      if (!value[key]) {
        context.addIssue({
          code: "custom",
          path: [key],
          message: "is required when STORAGE_DRIVER is s3",
        });
      }
    }
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "environment"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid server environment: ${details}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
