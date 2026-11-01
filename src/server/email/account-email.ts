import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nodemailer, { type Transporter } from "nodemailer";

import { getServerEnv, type ServerEnv } from "@/lib/config/env";
import { logger } from "@/lib/logging/logger";

type AccountEmail =
  | { purpose: "verification"; to: string; token: string }
  | { purpose: "password-reset"; to: string; token: string };

function isLocalOrigin(value: string): boolean {
  try {
    const host = new URL(value).hostname;
    return (
      host === "localhost" ||
      host.endsWith(".localhost") ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

function emailBaseUrl(env: ServerEnv): string {
  if (!isLocalOrigin(env.NEXT_PUBLIC_SITE_URL)) {
    return env.NEXT_PUBLIC_SITE_URL;
  }

  if (env.AUTH_URL && !isLocalOrigin(env.AUTH_URL)) {
    return env.AUTH_URL;
  }

  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

  return vercelHost ? `https://${vercelHost}` : env.NEXT_PUBLIC_SITE_URL;
}

function buildEmail(input: AccountEmail, env: ServerEnv): { subject: string; body: string } {
  const baseUrl = emailBaseUrl(env);

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

function smtpTransport(env: ServerEnv): Transporter | null {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
    return null;
  }

  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE || env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

export async function deliverAccountEmail(input: AccountEmail): Promise<boolean> {
  const env = getServerEnv();

  if (env.NODE_ENV === "test") {
    return true;
  }

  const { subject, body } = buildEmail(input, env);
  const from = env.EMAIL_FROM ?? env.SMTP_USER;
  const transport = smtpTransport(env);

  if (transport && from) {
    try {
      const info = await transport.sendMail({
        from,
        to: input.to,
        subject,
        text: body,
      });

      logger.info("email.smtp_sent", { purpose: input.purpose, messageId: info.messageId });
      return true;
    } catch (error) {
      logger.error("email.smtp_failed", { purpose: input.purpose, error });
      return false;
    } finally {
      transport.close();
    }
  }

  if (env.NODE_ENV === "production") {
    logger.warn("email.delivery_unconfigured", {
      purpose: input.purpose,
      hostPresent: Boolean(env.SMTP_HOST),
      userPresent: Boolean(env.SMTP_USER),
      credentialPresent: Boolean(env.SMTP_PASSWORD),
      senderPresent: Boolean(from),
    });
    return false;
  }

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
