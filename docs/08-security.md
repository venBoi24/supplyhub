# 8. Security Requirements and Threat Model

## Protect these assets

Account credentials and sessions; customer personal data and addresses;
vendor business data; inventory and pricing; orders; payment state;
commission ledger and payouts; uploaded media; admin privileges; secrets
and backups.

## Primary threats

-   broken access control / IDOR across customers and vendors;
-   privilege escalation and account takeover;
-   SQL injection, XSS, CSRF and insecure redirects;
-   forged or replayed payment webhooks;
-   price, discount, commission or stock tampering;
-   malicious uploads and stored active content;
-   brute force, credential stuffing, scraping and denial of service;
-   sensitive information leaking through logs, analytics, errors or
    cached responses;
-   dependency compromise and exposed secrets.

## Mandatory controls

1.  Server-side authorization for every protected operation.
2.  Zod or equivalent validation for all untrusted inputs.
3.  ORM parameterization and strict handling of raw SQL.
4.  Output encoding and safe rendering of user-generated text.
5.  CSRF defenses appropriate to the authentication/request model.
6.  Secure cookies, session expiry/rotation and revocation.
7.  Rate limiting and abuse controls on sensitive endpoints.
8.  Secure headers and a reviewed Content Security Policy.
9.  File upload allowlists, size limits, generated object keys and
    storage outside executable application paths.
10. Server-side price/commission/stock calculations.
11. Transactional checkout and inventory mutation.
12. Payment webhook signature verification, timestamp/replay defenses
    where supported, and idempotency.
13. Audit logs for admin and financial state changes.
14. Secret management, dependency updates and least-privilege service
    credentials.
15. Backups and a tested restore process.

## Payment safety

-   Never store raw card data.
-   Prefer a provider-hosted checkout or tokenized flow.
-   Keep provider secrets server-side.
-   Verify amount, currency, order reference and provider status on the
    server.
-   Do not fulfill orders based solely on a redirect or client-submitted
    status.
-   Treat webhooks as at-least-once delivery: duplicate events must not
    duplicate orders, ledger entries or payouts.
-   Define reconciliation for delayed, failed, refunded and disputed
    transactions.

## Logging

Log event type, actor ID where appropriate, target resource, correlation
ID, outcome and timestamp. Never log passwords, session tokens, full
payment details, secret keys or unnecessary personal information.
Sanitize user-controlled log fields to reduce log injection.

## Verification tests

-   Vendor A cannot view, edit or delete Vendor B's
    products/orders/payouts.
-   Customer A cannot access Customer B's orders or addresses by
    changing IDs.
-   A non-admin cannot invoke admin actions directly.
-   Client price or role tampering is ignored/rejected.
-   Invalid upload content and oversized files are rejected.
-   Invalid or duplicate webhook events cannot mark an order paid twice.
-   Checkout cannot oversell inventory under concurrent requests.
-   Private routes and responses are not exposed through public caching.
-   Secrets are absent from committed files and client bundles.

Use OWASP ASVS and relevant OWASP cheat sheets as review references.
Security is an ongoing release gate, not a final decorative phase.
