import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";

type AccountEmail =
  | { purpose: "verification"; to: string; token: string }
  | { purpose: "password-reset"; to: string; token: string };

function buildEmail(input: AccountEmail): { subject: string; body: string } {
  const baseUrl = getServerEnv().NEXT_PUBLIC_SITE_URL;

  if (input.purpose === "verification") {
    const url = new URL("/verify-email", baseUrl);
    url.searchParams.set("token", input.token);

    return {
      subject: "Verify your SupplyHub email",
      body: [
        "Confirm your email address to finish setting up your SupplyHub account.",
        "",
        url.toString(),
        "",
        "This link expires in 24 hours. If you did not create an account, ignore this message.",
      ].join("\n"),
    };
  }

  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", input.token);

  return {
    subject: "Reset your SupplyHub password",
    body: [
      "Use the link below to choose a new password. This link expires in one hour.",
      "",
      url.toString(),
      "",
      "Resetting your password signs you out everywhere. If you did not request this, ignore this message.",
    ].join("\n"),
  };
}

// Development-only delivery. Production email remains an unresolved provider decision.
export async function deliverAccountEmail(input: AccountEmail): Promise<boolean> {
  const { NODE_ENV } = getServerEnv();

  if (NODE_ENV === "production") {
    logger.warn("email.delivery_unconfigured", { purpose: input.purpose });
    return false;
  }

  if (NODE_ENV === "test") {
    return true;
  }

  const { subject, body } = buildEmail(input);
  const outbox = path.join(process.cwd(), ".local", "mail-outbox");
  const filename = `${Date.now()}-${input.purpose}-${randomUUID()}.txt`;

  await mkdir(outbox, { recursive: true });
  await writeFile(
    path.join(outbox, filename),
    `To: ${input.to}\nSubject: ${subject}\n\n${body}\n`,
    { encoding: "utf8", mode: 0o600 },
  );

  logger.info("email.dev_outbox_written", { purpose: input.purpose, filename });
  return true;
}
