# 6. Authentication, Authorization and Account Safety

## Authentication

Choose one approach before implementation: Auth.js with a supported
session strategy, or a vetted managed identity provider. Do not
implement custom cryptography or roll your own password storage.

If passwords are managed locally: - use a modern password hashing
function supported by the chosen authentication library; - enforce
secure reset flows with single-use, expiring tokens; - use generic
responses where needed to reduce account enumeration; - rate-limit
sign-in, sign-up, reset and verification endpoints; - provide secure
session rotation and revocation behavior.

## Authorization

Use server-side policies such as: - `canManageVendor(user, vendorId)` -
`canEditProduct(user, productId)` - `canViewOrder(user, orderId)` -
`canUpdateVendorOrder(user, vendorOrderId)` -
`canPerformAdminAction(user, action)`

These are illustrative policy names. Implement policies using actual
schema and domain rules. Check ownership on every read and mutation,
including API routes, server actions, exports, image access and
background jobs.

## Required boundaries

-   Guest: published public catalog only.
-   Customer: own profile, addresses, carts and orders.
-   Vendor: approved vendor resources and their own vendor orders only.
-   Vendor staff: only permissions explicitly granted to their vendor.
-   Admin: only granted administrative actions; sensitive actions
    logged.
-   Payment webhook: provider signature validation plus event
    idempotency, not a user session.

## Sessions and browser protections

-   Use secure, HTTP-only cookies with appropriate `SameSite` and
    `Secure` settings in production.
-   Prevent cross-site request forgery on state-changing flows where
    applicable.
-   Apply a sensible Content Security Policy and other security headers.
-   Avoid storing access tokens or secrets in `localStorage`.
-   Clear client caches and session-scoped data on sign-out.
-   Re-check authorization on the server; UI route guards alone are not
    security.

## Account lifecycle

Define email/phone verification, vendor approval, suspension, password
reset, account recovery, sign-out-all-sessions and account
deletion/retention policies. High-risk account changes should require
re-authentication or additional verification.
