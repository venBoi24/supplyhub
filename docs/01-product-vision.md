# 1. Product Vision and Functional Scope

## Product vision

Create a trustworthy, premium-feeling multi-vendor marketplace that
makes discovering products easy and gives independent sellers clear
tools to operate their stores. The product should feel modern and
expressive without sacrificing usability, speed, accessibility or trust.

## User roles

### Guest

-   Browse published products and categories.
-   Search, sort and filter products.
-   View product details, vendor profile and delivery information.
-   Register or sign in.

### Customer

-   Manage profile, addresses and preferences.
-   Maintain a cart and checkout.
-   View order history and order details.
-   Track fulfillment and request support/eligible returns.
-   Submit reviews only when the purchase and review policy permit.

### Vendor

-   Apply to become a vendor and provide required business details.
-   Wait for approval before selling, where moderation is enabled.
-   Manage store profile, products, images, SKU, price and stock.
-   View only their own vendor orders and update permitted fulfillment
    states.
-   View sales summaries, commissions, payout records and notifications.
-   Export permitted reports.

### Administrator

-   Manage users, vendor applications, categories, products and
    moderation.
-   Configure commission rules and marketplace policies.
-   Review orders, refunds, disputes, reports and audit events.
-   Manage feature settings and view operational dashboards.
-   Apply least-privilege admin access; high-risk actions should require
    confirmation and be logged.

## MVP scope

1.  Public storefront and responsive navigation.
2.  Search, categories, product listing and product detail pages.
3.  Registration, sign-in, sign-out, session handling and role-aware
    routing.
4.  Vendor application and approval.
5.  Vendor dashboard and CRUD for products, including image upload.
6.  Cart with server-verified prices and stock.
7.  Checkout flow with a payment-provider adapter or a clearly labeled
    sandbox mode.
8.  Parent customer order and vendor-specific order records.
9.  Order status history and vendor fulfillment actions.
10. Admin dashboard for vendor, catalog, user and order oversight.
11. Commission ledger and payout records, even if actual payouts are
    initially manual.
12. PWA manifest, installability, offline fallback and safe caching.
13. Audit logging, tests, error monitoring hooks and deployment
    documentation.

## Post-MVP candidates

-   Mobile-money integrations suitable for the target market.
-   Shipping-provider integration and delivery fee rules.
-   Coupons, promotions, wishlists and product comparisons.
-   Product Q&A, verified reviews and seller ratings.
-   Notifications by email/SMS/push, with consent and preference
    controls.
-   Advanced analytics, saved searches, recommendations and multilingual
    support.
-   Native mobile application only if PWA limitations justify the cost.

## Business rules to clarify and document

-   Marketplace country, currency and tax handling.
-   Whether checkout supports multiple vendors in one order.
-   Commission calculation base and whether shipping/discounts are
    included.
-   Vendor approval and identity/business verification process.
-   Refund, cancellation, return, dispute and payout policies.
-   Delivery responsibility and who pays shipping.
-   Payment provider, webhook behavior and settlement model.
-   Product moderation, prohibited items and review eligibility.

Do not invent these policies. Use configurable defaults in development
and mark unresolved business decisions clearly.
