import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ServerEnv } from "@/lib/config/env";

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
  close: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}));
vi.mock("@/lib/config/env", () => ({
  getServerEnv: vi.fn(),
}));

import { getServerEnv } from "@/lib/config/env";
import { deliverAccountEmail } from "@/server/email/account-email";

const baseEnv = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://supplyhub.example",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: 587,
  SMTP_SECURE: false,
  SMTP_USER: "mailer@supplyhub.example",
  SMTP_PASSWORD: "smtp-password",
  EMAIL_FROM: "SupplyHub <no-reply@supplyhub.example>",
} as unknown as ServerEnv;

function useEnv(overrides: Record<string, unknown> = {}): void {
  vi.mocked(getServerEnv).mockReturnValue({ ...baseEnv, ...overrides } as ServerEnv);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.sendMail.mockResolvedValue({ messageId: "message-1" });
  mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail, close: mocks.close });
});

describe("account email delivery", () => {
  it("sends a verification link through SMTP", async () => {
    useEnv();

    const delivered = await deliverAccountEmail({
      purpose: "verification",
      to: "customer@example.com",
      token: "verify-token",
    });

    expect(delivered).toBe(true);
    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: { user: "mailer@supplyhub.example", pass: "smtp-password" },
      }),
    );
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "SupplyHub <no-reply@supplyhub.example>",
        to: "customer@example.com",
        subject: "Verify your SupplyHub email",
        text: expect.stringContaining("https://supplyhub.example/verify-email?token=verify-token"),
      }),
    );
    expect(mocks.close).toHaveBeenCalled();
  });

  it("uses implicit TLS on port 465", async () => {
    useEnv({ SMTP_PORT: 465 });

    await deliverAccountEmail({
      purpose: "password-reset",
      to: "customer@example.com",
      token: "reset-token",
    });

    expect(mocks.createTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true }));
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: "Reset your SupplyHub password",
        text: expect.stringContaining("https://supplyhub.example/reset-password?token=reset-token"),
      }),
    );
  });

  it("falls back to the Vercel origin when the configured site URL is local", async () => {
    const previous = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "supplyhub.vercel.app";

    try {
      useEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });

      await deliverAccountEmail({
        purpose: "verification",
        to: "customer@example.com",
        token: "verify-token",
      });

      expect(mocks.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining(
            "https://supplyhub.vercel.app/verify-email?token=verify-token",
          ),
        }),
      );
    } finally {
      if (previous === undefined) {
        delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
      } else {
        process.env.VERCEL_PROJECT_PRODUCTION_URL = previous;
      }
    }
  });

  it("returns false without sending when production SMTP is unconfigured", async () => {
    useEnv({ SMTP_HOST: undefined, SMTP_USER: undefined, SMTP_PASSWORD: undefined });

    const delivered = await deliverAccountEmail({
      purpose: "verification",
      to: "customer@example.com",
      token: "verify-token",
    });

    expect(delivered).toBe(false);
    expect(mocks.createTransport).not.toHaveBeenCalled();
  });
});
