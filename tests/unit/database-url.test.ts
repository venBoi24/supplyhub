import { describe, expect, it } from "vitest";

import {
  isLoopbackDatabaseUrl,
  normalizeDatabaseUrl,
  resolveDatabaseUrl,
  resolveMigrationDatabaseUrl,
} from "@/lib/config/database-url";

const LOCAL_URL = "postgresql://postgres:postgres@localhost:51214/supplyhub?sslmode=disable";
const REMOTE_URL = "postgresql://app:secret@db.example.com:5432/supplyhub";
const TRANSACTION_URL =
  "postgresql://postgres.ref:pass@aws-0-eu-west-1.pooler.supabase.com:6543/postgres";
const SESSION_URL =
  "postgresql://postgres.ref:pass@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";
const DIRECT_URL = "postgresql://postgres:Aura24@venkinjukA@db.ref.supabase.co:5432/postgres";

describe("database URL resolution", () => {
  it("keeps an explicit remote DATABASE_URL", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: REMOTE_URL })).toBe(
      "postgresql://app:secret@db.example.com:5432/supplyhub?sslmode=require",
    );
  });

  it("prefers the Supabase pooler on Vercel when DATABASE_URL is a loopback address", () => {
    const resolved = resolveDatabaseUrl({
      VERCEL: "1",
      DATABASE_URL: LOCAL_URL,
      SUPABASE_TRANSACTION_POOLER_KEY: TRANSACTION_URL,
      SUPABASE_SESSION_POOLER_KEY: SESSION_URL,
    });

    expect(resolved).toContain("aws-0-eu-west-1.pooler.supabase.com:6543");
    expect(resolved).toContain("sslmode=no-verify");
  });

  it("keeps the loopback DATABASE_URL in local development", () => {
    expect(
      resolveDatabaseUrl({
        DATABASE_URL: LOCAL_URL,
        SUPABASE_TRANSACTION_POOLER_KEY: TRANSACTION_URL,
      }),
    ).toBe(LOCAL_URL);
  });

  it("falls back to a Supabase key when DATABASE_URL is absent", () => {
    expect(resolveDatabaseUrl({ SUPABASE_SESSION_POOLER_KEY: SESSION_URL })).toContain(":6543/");
  });

  it("percent-encodes an at sign in the direct connection password", () => {
    const resolved = normalizeDatabaseUrl(DIRECT_URL);

    expect(resolved).toContain("Aura24%40venkinjukA");
    expect(resolved).toContain("@db.ref.supabase.co:5432");
    expect(resolved).toContain("sslmode=no-verify");
  });

  it("uses the session pooler for migrations when deployed", () => {
    const resolved = resolveMigrationDatabaseUrl({
      VERCEL: "1",
      SUPABASE_TRANSACTION_POOLER_KEY: TRANSACTION_URL,
      SUPABASE_SESSION_POOLER_KEY: SESSION_URL,
    });

    expect(resolved).toContain("aws-0-eu-west-1.pooler.supabase.com:5432");
    expect(resolved).toContain("sslmode=no-verify");
  });

  it("keeps a local DATABASE_URL for migrations outside deployment", () => {
    expect(
      resolveMigrationDatabaseUrl({
        DATABASE_URL: LOCAL_URL,
        SUPABASE_SESSION_POOLER_KEY: SESSION_URL,
      }),
    ).toBe(LOCAL_URL);
  });

  it("recognises loopback hosts", () => {
    expect(isLoopbackDatabaseUrl(LOCAL_URL)).toBe(true);
    expect(isLoopbackDatabaseUrl("postgresql://app:secret@127.0.0.1:5432/app")).toBe(true);
    expect(isLoopbackDatabaseUrl(REMOTE_URL)).toBe(false);
    expect(isLoopbackDatabaseUrl("not a url")).toBe(false);
  });
});
