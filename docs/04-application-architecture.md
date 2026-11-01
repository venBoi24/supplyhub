# 4. Application Architecture and Suggested Structure

## Architectural principles

-   Modular monolith with explicit domain boundaries.
-   Server components by default; client components only when required.
-   UI components do not directly own complex business rules.
-   Server-side service functions own business operations.
-   Authorization is checked on the server at the point of use.
-   Database access is centralized and typed.
-   External systems (payments, email, storage) are accessed through
    adapters.
-   Use background jobs for slow or retryable work when needed.

## Suggested structure

``` text
src/
  app/
    (storefront)/
      page.tsx
      products/
      categories/
      vendors/
      cart/
      checkout/
    (auth)/
      sign-in/
      sign-up/
      reset-password/
    (customer)/
      account/
      orders/
      wishlist/
    (vendor)/
      vendor/
        dashboard/
        products/
        orders/
        payouts/
    (admin)/
      admin/
        dashboard/
        vendors/
        products/
        orders/
        users/
        settings/
    api/
      health/
      webhooks/
  components/
    ui/
    layout/
    storefront/
    product/
    forms/
    feedback/
    dashboard/
  features/
    auth/
    vendors/
    catalog/
    inventory/
    cart/
    checkout/
    orders/
    payments/
    commissions/
    payouts/
    reviews/
  server/
    auth/
    db/
    services/
    repositories/
    policies/
    integrations/
  lib/
    validation/
    formatting/
    config/
    logging/
  styles/
    globals.css
  types/
prisma/
  schema.prisma
  migrations/
public/
  icons/
  images/
tests/
  unit/
  integration/
  e2e/
docs/
```

This is a reference structure, not a command to reorganize a working
repository blindly. Adapt it to existing conventions and document major
deviations.

## Request flow

1.  Browser submits a request or invokes a server action.
2.  Server validates identity, payload and request context.
3.  Authorization policy verifies role and resource ownership.
4.  Service executes business rules.
5.  Repository/ORM reads or writes PostgreSQL.
6.  Transaction commits where atomicity is required.
7.  Response returns only fields the caller is allowed to see.
8.  Sensitive operations create audit events and structured logs.

## API conventions

-   Use consistent HTTP semantics and response shapes.
-   Validate path parameters, query parameters and request bodies.
-   Return appropriate status codes without leaking stack traces or
    internal details.
-   Add pagination and bounded limits to list endpoints.
-   Apply rate limits to expensive or abuse-prone operations.
-   Do not expose internal ORM records directly as public API contracts.
-   Use idempotency keys for payment/checkout actions where appropriate.

## Domain boundaries

Catalog owns published product data; inventory owns stock mutations;
checkout coordinates cart validation, price calculation and order
creation; payments records provider states; commissions calculates
ledger entries; payouts tracks settlement; authorization policies define
who may act on each resource.

## Database transactions

Checkout should atomically verify stock and create the necessary order
records/reservations. Use appropriate transaction isolation or locking
to prevent concurrent overselling. Payment confirmation and order
fulfillment must be modeled as explicit state transitions, not loose
booleans.
