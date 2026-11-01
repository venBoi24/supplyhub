import { describe, expect, it } from "vitest";

import { FixedWindowRateLimiter } from "@/server/security/rate-limiter";

const rule = { limit: 3, windowMs: 1_000 };

describe("FixedWindowRateLimiter", () => {
  it("allows requests up to the limit and denies the next one", () => {
    const limiter = new FixedWindowRateLimiter();

    expect(limiter.consume("email", rule, 0)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
    expect(limiter.consume("email", rule, 100).allowed).toBe(true);
    expect(limiter.consume("email", rule, 200)).toEqual({
      allowed: true,
      remaining: 0,
      retryAfterMs: 0,
    });
    expect(limiter.consume("email", rule, 300)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterMs: 700,
    });
  });

  it("starts a fresh window once the window expires", () => {
    const limiter = new FixedWindowRateLimiter();

    limiter.consume("email", rule, 0);
    limiter.consume("email", rule, 0);
    limiter.consume("email", rule, 0);
    expect(limiter.consume("email", rule, 999).allowed).toBe(false);

    expect(limiter.consume("email", rule, 1_000)).toEqual({
      allowed: true,
      remaining: 2,
      retryAfterMs: 0,
    });
  });

  it("tracks keys independently", () => {
    const limiter = new FixedWindowRateLimiter();

    limiter.consume("email:a", rule, 0);
    limiter.consume("email:a", rule, 0);
    limiter.consume("email:a", rule, 0);

    expect(limiter.consume("email:a", rule, 0).allowed).toBe(false);
    expect(limiter.consume("email:b", rule, 0).allowed).toBe(true);
  });

  it("resets one key or every key", () => {
    const limiter = new FixedWindowRateLimiter();

    limiter.consume("a", rule, 0);
    limiter.consume("a", rule, 0);
    limiter.consume("a", rule, 0);
    limiter.reset("a");

    expect(limiter.consume("a", rule, 0).allowed).toBe(true);

    limiter.consume("a", rule, 0);
    limiter.consume("a", rule, 0);
    limiter.consume("a", rule, 0);
    limiter.reset();

    expect(limiter.consume("a", rule, 0).allowed).toBe(true);
  });

  it("evicts expired buckets before admitting new keys", () => {
    const limiter = new FixedWindowRateLimiter(2);

    limiter.consume("old", rule, 0);
    limiter.consume("current", rule, 500);
    limiter.consume("new", rule, 1_100);
    limiter.consume("newer", rule, 1_100);

    expect(limiter.consume("newest", rule, 1_100).allowed).toBe(true);
  });
});
