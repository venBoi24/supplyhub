import type { RateLimitRule } from "./rate-limiter";

export const AUTH_RATE_LIMITS = {
  signInByEmail: { limit: 10, windowMs: 15 * 60 * 1000 },
  signInByAddress: { limit: 40, windowMs: 15 * 60 * 1000 },
  signUpByEmail: { limit: 3, windowMs: 60 * 60 * 1000 },
  signUpByAddress: { limit: 8, windowMs: 60 * 60 * 1000 },
  recoveryByEmail: { limit: 5, windowMs: 60 * 60 * 1000 },
  recoveryByAddress: { limit: 20, windowMs: 60 * 60 * 1000 },
  resetByAddress: { limit: 20, windowMs: 60 * 60 * 1000 },
  verificationByAddress: { limit: 40, windowMs: 60 * 60 * 1000 },
  resendByUser: { limit: 3, windowMs: 60 * 60 * 1000 },
  vendorApplyByUser: { limit: 5, windowMs: 60 * 60 * 1000 },
  checkoutByUser: { limit: 10, windowMs: 10 * 60 * 1000 },
  paymentByUser: { limit: 12, windowMs: 10 * 60 * 1000 },
  paymentStatusByUser: { limit: 120, windowMs: 10 * 60 * 1000 },
  refundByAdmin: { limit: 20, windowMs: 10 * 60 * 1000 },
  payoutByAdmin: { limit: 20, windowMs: 10 * 60 * 1000 },
} satisfies Record<string, RateLimitRule>;
