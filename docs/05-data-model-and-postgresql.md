# 5. PostgreSQL Data Model and Integrity

## Core entities

-   `User`: identity, email/phone as appropriate, password hash if
    locally managed, account status and timestamps.
-   `Role` or role assignments: platform-level permissions. Avoid
    trusting a role passed from the client.
-   `Vendor`: owner user, store slug/name, description, approval status
    and business profile.
-   `VendorMember` (optional): additional staff users and vendor-scoped
    permissions.
-   `Category`: hierarchy, slug and publication status.
-   `Product`: vendor ID, category ID, slug, title, description, status,
    SKU, base price and timestamps.
-   `ProductImage`: product ID, object-storage key, alt text, sort order
    and moderation state.
-   `ProductVariant` (when needed): variant-specific SKU, options, price
    and stock.
-   `InventoryMovement`: auditable stock changes and reasons.
-   `Cart` / `CartItem`: user or session cart and selected quantities.
-   `Order`: customer, currency, address snapshot, totals and overall
    state.
-   `VendorOrder`: order ID, vendor ID, vendor subtotal, shipping and
    fulfillment state.
-   `OrderItem`: product/vendor references plus immutable snapshots of
    title, SKU, unit price, quantity and discounts.
-   `Payment`: provider, external reference, amount, currency, status
    and idempotency identifiers.
-   `Refund`: payment/order references, amount, reason and provider
    status.
-   `CommissionRule` / `CommissionLedger`: rule versions and immutable
    calculated ledger entries.
-   `Payout`: vendor, period, amount, status, reference and
    reconciliation data.
-   `Address`: user-owned address; copy relevant address fields into an
    order snapshot at checkout.
-   `Review`: customer, product, order item, rating, text and moderation
    status.
-   `AuditLog`: actor, action, resource type/ID, timestamp and safe
    metadata.
-   `Notification`: recipient, channel, content reference, status and
    delivery timestamps.

## Integrity rules

-   Use UUIDs or another consistent non-guessable identifier strategy.
-   Use foreign keys, appropriate unique constraints and indexes.
-   Use `timestamptz` for instants and define the application timezone
    policy.
-   Use PostgreSQL `numeric` for monetary values; never use
    floating-point for money.
-   Store currency code explicitly. Do not assume all transactions use
    one currency forever.
-   Keep raw provider payloads only when needed, with restricted access
    and sensitive fields removed.
-   Index common lookups: product slug, vendor ID, product
    status/category, order customer/status/date, vendor order
    vendor/status/date, payment provider reference and webhook
    idempotency key.
-   Use soft deletion only where it has a clear business or compliance
    purpose. Prefer status transitions for orders and financial records.
-   Never cascade-delete financial records or order history without an
    explicitly reviewed retention policy.
-   Use database migrations committed to version control.

## Marketplace order model

A customer can place one parent order containing items from multiple
vendors. Create one `VendorOrder` per vendor and attach each `OrderItem`
to the correct vendor order. A vendor can only see their own
vendor-order slice. The customer sees the parent order; admin access is
governed separately.

## Price and commission snapshots

At checkout, calculate prices and discounts on the server. Snapshot the
final unit price and applicable product/vendor identifiers into order
items. Snapshot the commission rule/version and calculated amounts in
the ledger so later changes to the commission configuration do not
rewrite history.

## State machines

Document allowed transitions for: - vendor application:
`pending -> approved | rejected -> suspended` as policy permits; -
product:
`draft -> pending_review -> published | rejected -> archived`; -
payment: provider-specific pending/succeeded/failed/refunded states; -
order/vendor order: awaiting payment, paid, processing, shipped/ready,
delivered, cancelled/returned where policy permits; - payout: pending,
approved, processing, paid, failed/reconciled.

Do not allow arbitrary status updates from a generic client form.
Enforce transition rules in server-side services.

## Privacy

Collect only data required to operate the marketplace. Define retention
and deletion procedures, protect address and contact details, and
prevent sensitive customer information from appearing in logs or vendor
reports unless required for fulfillment.
