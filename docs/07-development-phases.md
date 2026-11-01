# 7. Development Phases and Acceptance Gates

Work phase by phase. Do not start a new phase until its gate is met or
the user explicitly accepts documented gaps.

## Phase 0 --- Repository audit and planning

Tasks: - inspect files, package manager, current routes, dependencies,
database and existing design; - identify what already works and what
must be preserved; - document architecture choices, unresolved business
questions and risks; - propose an incremental plan.

Gate: baseline findings and plan are recorded; no destructive changes
made.

## Phase 1 --- Project foundation

Tasks: - configure Next.js App Router, TypeScript strict mode, Tailwind
and lint/format tooling; - establish design tokens, typography, layout
shell and component conventions; - configure PostgreSQL connection, ORM
and initial migrations; - add safe environment validation, health
endpoint and error handling; - add CI checks.

Gate: clean install, development server, production build, lint and
typecheck pass.

## Phase 2 --- Design system and storefront shell

Tasks: - create responsive header, search, navigation, footer, buttons,
form controls, dialogs, toasts and product-card primitives; - build
home, category, search, product-detail and vendor-store pages using
seeded/demo catalog data clearly separated from production data; -
implement loading, empty, error and responsive states; - add purposeful
motion and optional lightweight hero visual.

Gate: screens are visually consistent and usable on mobile and desktop;
keyboard and reduced-motion checks pass.

## Phase 3 --- Identity and role boundaries

Tasks: - implement sign-up/sign-in/sign-out, session lifecycle and
recovery/verification as selected; - implement customer, vendor and
admin authorization policies; - implement vendor application and
approval workflow; - test cross-role and cross-vendor access denial.

Gate: authorization tests prove users cannot access other users' or
vendors' private resources.

## Phase 4 --- Catalog and inventory

Tasks: - build category and product CRUD, image upload to object
storage, validation and moderation states; - implement SKU, variants if
needed, stock and inventory movement history; - add search, filters,
sort and pagination; - validate upload type/size and use generated
storage keys.

Gate: vendor isolation, image safety, search behavior and inventory
constraints are tested.

## Phase 5 --- Cart and checkout

Tasks: - implement cart persistence appropriate to signed-in and guest
users; - re-fetch authoritative price, discount, status and stock on the
server; - create parent order, vendor orders and item snapshots
transactionally; - define stock reservation and expiry/release
behavior; - build clear checkout confirmation and failure states.

Gate: tests cover mixed-vendor cart, price tampering, unavailable stock,
concurrent checkout and transaction rollback.

## Phase 6 --- Payments, commissions and payouts

Tasks: - implement a payment adapter and sandbox integration first; -
verify provider webhook signatures and idempotency; - model payment
state transitions, refunds and reconciliation; - calculate commission
using documented rules and record immutable ledger entries; - implement
payout records and manual reconciliation before automated payouts if
necessary.

Gate: no order is marked paid from client redirect alone;
duplicate/out-of-order webhooks are handled safely; financial totals
reconcile.

## Phase 7 --- Vendor and admin operations

Tasks: - vendor dashboards for products, stock, vendor orders, sales and
payout history; - admin dashboards for users, vendor applications,
products, orders, moderation, commissions and audit logs; - add
pagination, filters, export permissions and confirmation for destructive
actions.

Gate: every dashboard metric has a defined source and every action is
permission-checked and audited where appropriate.

## Phase 8 --- PWA and performance

Tasks: - configure web app manifest, icons, installability and offline
fallback; - use a maintained service-worker strategy compatible with the
chosen Next.js version; - cache static assets and safe public data only;
do not cache private account, checkout, payment or admin responses in
shared caches; - optimize images, fonts, route bundles and third-party
visuals; - test offline and update behavior.

Gate: installability and offline fallback are tested; sensitive data is
not available from stale caches; performance budgets are reviewed.

## Phase 9 --- Quality, security and release

Tasks: - run unit, integration and Playwright tests; - perform
authorization, input validation, upload, rate-limit and webhook
reviews; - test mobile responsiveness, keyboard navigation, contrast and
reduced motion; - verify backups, restore procedure, logging, monitoring
and production environment; - document deployment, rollback and support
procedures.

Gate: release checklist in `10-testing-and-definition-of-done.md` is
satisfied; remaining risks are written down.

## Phase 10 --- Post-launch improvements

Prioritize based on observed user needs: shipping integrations, mobile
money, notification preferences, coupons, wishlists, analytics,
multilingual UX and recommendations. Do not add them before the core
marketplace is reliable.
