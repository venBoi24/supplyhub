export interface RateLimitRule {
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(private readonly maxEntries = 10_000) {}

  consume(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
    this.evictIfNeeded(now);

    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + rule.windowMs });
      return { allowed: true, remaining: rule.limit - 1, retryAfterMs: 0 };
    }

    if (bucket.count >= rule.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(0, bucket.resetAt - now),
      };
    }

    bucket.count += 1;

    return {
      allowed: true,
      remaining: Math.max(0, rule.limit - bucket.count),
      retryAfterMs: 0,
    };
  }

  reset(key?: string): void {
    if (key === undefined) {
      this.buckets.clear();
      return;
    }

    this.buckets.delete(key);
  }

  private evictIfNeeded(now: number): void {
    if (this.buckets.size < this.maxEntries) {
      return;
    }

    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }

    while (this.buckets.size >= this.maxEntries) {
      const oldestKey = this.buckets.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      this.buckets.delete(oldestKey);
    }
  }
}
