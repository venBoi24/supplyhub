# 10. Testing Strategy and Definition of Done

## Test layers

### Unit tests

Test money calculations, commission rules, state transitions, validation
schemas, formatting, inventory calculations and authorization policy
helpers.

### Integration tests

Test database repositories and services, transaction behavior, vendor
isolation, order creation, webhook idempotency and inventory concurrency
using an isolated test database.

### End-to-end tests

Use Playwright to cover: 1. Guest browses, searches and filters
products. 2. Customer registers/signs in and maintains a cart. 3.
Customer checks out in sandbox mode. 4. Mixed-vendor cart creates the
correct vendor orders. 5. Vendor creates/updates a product and processes
only their own order. 6. Vendor A is denied access to Vendor B's
resources. 7. Admin approves/rejects a vendor and moderates a product.
8. Payment webhook success/failure/duplicate scenarios. 9. PWA offline
fallback and installability checks where supported. 10. Responsive
layout and essential keyboard interactions.

## Required automated checks

-   formatter check;
-   lint;
-   TypeScript type check;
-   unit and integration tests;
-   production build;
-   Playwright smoke tests for critical workflows;
-   dependency and secret scanning where CI supports them.

## Accessibility checks

-   keyboard-only navigation;
-   visible focus and sensible focus order;
-   semantic headings and landmarks;
-   accessible names for icon-only buttons;
-   form labels and error announcements;
-   sufficient color contrast;
-   reduced-motion behavior;
-   mobile zoom and responsive reflow.

Automated accessibility checks help but do not replace manual testing.

## Definition of done for a feature

A feature is done only when: - acceptance criteria are met; - server
validation and authorization are implemented; - loading, empty, error
and success states exist; - relevant tests are added and pass; -
responsive and keyboard behavior is reviewed; - no secrets or unsafe
debug code are introduced; - docs and environment examples are updated
when needed; - lint, typecheck and relevant build checks pass; - known
limitations are explicitly reported.

## Release checklist

-   [ ] Production environment variables set securely.
-   [ ] Database migrations reviewed and applied through release
    process.
-   [ ] Backup and restore have been tested.
-   [ ] HTTPS and security headers verified.
-   [ ] Authentication and vendor-isolation tests pass.
-   [ ] Payment sandbox tests and webhook idempotency pass.
-   [ ] Production payment configuration reviewed separately from
    sandbox.
-   [ ] PWA cache excludes private/sensitive responses.
-   [ ] Error monitoring and safe structured logging are active.
-   [ ] Rate limits and upload restrictions are configured.
-   [ ] Mobile, desktop, reduced-motion and keyboard checks pass.
-   [ ] Legal policies, privacy notices, returns and vendor terms are
    ready for the operating region.
-   [ ] Rollback plan and operational owner are documented.

## Agent completion report

For each completed phase, report: - features implemented; - important
files changed; - commands/checks run and their actual results; - tests
added; - security and performance implications; - unresolved decisions
and next recommended phase.
