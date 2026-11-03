# SupplyHub

A premium multi-vendor marketplace built with Next.js 16, TypeScript, Tailwind CSS, PostgreSQL,
Prisma, and a server-first security model.

## Status

Phase 6 (payments and reconciliation) is complete. Guests and signed-in customers keep a
server-owned cart, checkout re-checks prices and stock, and placing an order creates one parent
order with a vendor order per studio plus immutable item snapshots. Orders are paid through the
LynxPay sandbox in Tanzanian shillings, stock reservations are released when payment never
arrives, and administrators reconcile payments, refunds, commission, and manual vendor payouts. The
PWA phases follow the gates in [docs/07-development-phases.md](docs/07-development-phases.md).

The Phase 3 gate is covered by unit tests that prove customers, vendors, and administrators cannot
read or mutate another user's or studio's private resources, including suspended accounts,
pending or rejected applications, and order access across vendors. The Phase 4 gate adds tests for
vendor product isolation, generated storage keys, image type and size validation, search query
parsing, and inventory constraints. The Phase 5 gate adds unit tests and PostgreSQL integration
tests for mixed-vendor carts, tampered client prices, unavailable stock, concurrent checkout, and
transaction rollback. The Phase 6 gate adds tests for webhook signature verification and replay
windows, provider amount mapping, commission and refund ledger arithmetic, payment validation, and
PostgreSQL integration tests proving that a browser redirect alone never marks an order paid,
duplicate and out-of-order webhooks resolve safely, and payment, refund, and payout totals
reconcile. The integration suites run when `TEST_DATABASE_URL` is set.

## Cart and checkout (Phase 5)

- Carts live in PostgreSQL. Signed-in carts are keyed by user; guest carts are keyed by a random
  token whose SHA-256 hash is stored in the database. The raw token lives only in an httpOnly
  cookie, and guest carts expire after 30 days. Signing in or signing up merges the guest cart into
  the account cart with an atomic upsert.
- Cart lines store only `productId` and `quantity`. Prices, names, stock, and availability are read
  from the database on every render, so a client cannot change a price or total.
- Checkout requires an active customer account, a fresh delivery address, and a rate limit of ten
  submissions per ten minutes. The cart row is locked with `SELECT … FOR UPDATE`, every line is
  re-validated (published product, approved studio, active department, matching currency, quantity
  within stock), and stock is decremented with a conditional update so concurrent checkout cannot
  oversell.
- A successful transaction writes the parent order, one vendor order per studio, item snapshots,
  `SALE` inventory movements, and an audit entry, then clears the cart. Any failure rolls back the
  whole transaction.
- Orders start as `AWAITING_PAYMENT` and reserve stock for `CHECKOUT_RESERVATION_MINUTES`
  (default 15). Expired reservations are released lazily on order reads and before checkout,
  incrementing stock once and recording a `RELEASE` movement. Every order status is visible at
  `/orders/[orderNumber]`, with history at `/account/orders`.
- Only the customer who placed an order and administrators can read it. A studio cannot open the
  parent order; vendor-scoped order access arrives with fulfillment in a later phase.
- An unpaid order keeps its reservation until payment completes or the reservation expires.
  Shipping and tax remain uncalculated configurable placeholders.

## Payments and reconciliation (Phase 6)

- **Provider.** Payments run through [LynxPay](https://lynxpay.africa/) using the sandbox API. The
  adapter interface in `src/server/payments/gateway.ts` keeps provider details behind one boundary;
  `src/server/payments/lynxpay/` holds the client, request schemas, amount mapping, and signature
  verification. A `manual` gateway is available for local development without provider keys.
- **Currency.** The demo catalogue and checkout use TZS because LynxPay settles in Tanzanian
  shillings. Amounts are stored as `numeric` and converted to integer cents before arithmetic;
  nothing financial uses floating point.
- **Initiation.** `POST /v1/payments` receives the merchant net amount. LynxPay charges its fee on
  top, so the customer pays the gross amount while the merchant ledger credits the order total. The
  UI states this explicitly before payment starts.
- **No payment from a redirect.** A return from the hosted card page only refreshes status. An order
  becomes `PAID` only after a signed webhook or a server-to-server status check reports
  `completed`. A failed or abandoned payment leaves the order awaiting payment until its
  reservation expires.
- **Webhooks.** `POST /api/webhooks/lynxpay` verifies `hex(HMAC-SHA256(secret, timestamp + "." +
rawBody))` before parsing, enforces the timestamp tolerance, accepts the previous secret inside
  its rotation window, caps the body size, and rejects non-JSON payloads. Deliveries are recorded
  once by provider delivery ID, so duplicates and out-of-order events cannot double-apply a
  transition; a late failure event cannot reverse a successful payment. Unknown or invalid requests
  are logged without payment or personal data.
- **State and ledger.** Attempts are idempotent per order attempt, and every accepted event is
  persisted before the payment state changes. A successful payment writes an immutable
  `CommissionLedger` entry per vendor order: gross sale, platform commission at the configured
  basis points, and the vendor earning. The default is 1000 bps (10%) under rule version
  `configurable-default-v1`; both values are configuration, not business policy.
- **Refunds.** Administrators can refund a payment in full or in part. Refund amounts are validated
  against the remaining balance, split across vendor orders by largest remainder, and written as
  negative ledger reversals so commission and vendor balances fall proportionally. Payment, order,
  and refund statuses are updated in one transaction.
- **Payouts.** Vendor earnings are reserved as administrators create payout records for a period,
  marked paid when funds leave manually, and reconciled to close the record. Balances separate
  earned, reserved (still held), paid out, and available amounts, so a payout cannot exceed what the
  ledger supports and settling a transfer moves the amount out of the reserved bucket.
- **Reconciliation.** `/admin/payments` lists every attempt with order, method, gross, fee, net,
  refunded, and ledger-net columns, flags any row whose totals do not reconcile, and shows refund
  history. `/admin/payouts` shows studio balances and payout records. These screens are read-only
  summaries over the ledger, so they cannot disagree with it by construction.

## Catalog and inventory (Phase 4)

- Products are owned by exactly one studio. Every studio write scopes by the session's vendor ID
  server-side; another studio's product ID returns 404. Image uploads, stock adjustments, edits,
  submission, and withdrawal all re-check ownership.
- New objects start as `DRAFT`. A studio submits work to `PENDING_REVIEW`, may withdraw it back to
  draft, and may not edit an object while it is in review; stock can still be adjusted so the
  inventory stays accurate. Administrators publish or return an object with a reason, and every
  decision is written to the audit log.
- Uploads accept JPEG, PNG, WebP, GIF, AVIF, or BMP up to 5 MB, verified by magic bytes rather than
  the declared MIME type. Keys are generated server-side as `products/<productId>/<uuid>.<ext>`, so
  a client cannot choose a path, overwrite another object's image, or upload SVG or executable
  content.
- Development storage is a local driver at `.local/uploads` behind the `/media/[...key]` route,
  which serves only known image extensions with immutable caching and rejects traversal. The
  storage interface and an S3-compatible driver are separated so a production bucket can replace
  the local driver without touching feature code.
- Stock is an integer on the product plus an append-only `inventory_movements` ledger (delta, note,
  author, timestamp). Adjusting stock in the studio and opening stock at creation both write a
  movement; stock may never go negative.
- Search matches names, summaries, descriptions, materials, studio names, and cities using a
  denormalized normalized search column. Listing pages support department filtering, price and
  recency sorting, and clamped pagination.
- Departments (categories) are managed at `/admin/categories`: create, edit, and archive. An
  archived department and its objects disappear from the public catalog.

## Accounts and studio review (Phase 3)

- Auth.js v5 Credentials provider with JWT sessions (seven days, 24-hour refresh) and Argon2id
  password hashing. Sign-in verifies a dummy hash for unknown emails so responses do not reveal
  whether an account exists.
- Every session read re-checks role, status, `sessionVersion`, and vendor status in PostgreSQL.
  Suspended accounts and revoked sessions stop working on the next request, and admin promotion or
  vendor approval applies without re-login.
- Verification and password-reset tokens are single-use, expiring, and stored only as SHA-256
  hashes. Resetting a password increments `sessionVersion`, ending every other session.
- Sign-up and sign-in are rate limited per email and per address. Limits are held in process
  memory, so a multi-instance deployment needs a shared store.
- Email delivery uses SMTP through Nodemailer when `SMTP_HOST`, `SMTP_USER`, and `SMTP_PASSWORD`
  are set. Without SMTP, development writes to `.local/mail-outbox/` and production logs
  `email.delivery_unconfigured` without sending.
- Server-only policy functions in `src/server/auth/policies.ts` decide vendor, account, admin, and
  order access; page guards redirect to sign-in or `/account?denied=…`.
- Vendor applications move `PENDING → APPROVED | REJECTED`; approval promotes the owner to
  `VENDOR`, and every decision writes an audit entry. Rejected applicants cannot reapply in this
  phase.
- The first administrator is created with `npm run admin:promote -- you@example.com` after the
  account registers. There is no self-service admin sign-up.

## Storefront (Phase 2, now database-backed)

- The catalogue was prototyped as an isolated demo layer and moved to PostgreSQL in Phase 4. The
  surfaces, prices, and photography carried over; catalog reads now come from the seeded database.
- Every surface still labels the catalogue as a preview. "Add to cart" opens a real server cart,
  checkout records a real order, and payment opens in the LynxPay sandbox.
- Typography pairs Bricolage Grotesque (display), Geist (body), and Geist Mono (labels). The maker
  label is the signature element and travels from product cards to detail pages.
- Motion uses only gentle reveals and does not hide content without JavaScript hydration.
  `prefers-reduced-motion` removes both the global transitions and the reveal offset.
- No 3D is used in this phase. The editorial hero relies on photography and type, which keeps the
  largest contentful paint fast and the experience consistent on low-end devices.
- Demo photography in `public/images/demo/` is generated for this preview and contains no real
  product claims or trademarks.
- Lighthouse: accessibility, best practices, and SEO score 100 on the home page (desktop) and
  product detail (mobile).

## Requirements

- Node.js 22.12 or newer (CI pins Node 24 via `.nvmrc`)
- npm 10 or newer
- PostgreSQL 15+ **or** the local Prisma Postgres dev server

## Setup

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env` to a PostgreSQL instance and `AUTH_SECRET` to 32 random bytes
(base64). For a disposable local database:

```bash
npm run db:dev -- -d
```

Copy the printed connection string into `.env`, then apply migrations and seed the demo catalog:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Payments read provider configuration from the same validated environment:

```dotenv
PAYMENT_PROVIDER="lynxpay"
LYNXPAY_API_KEY="lynx_test_sk_..."
LYNXPAY_SIGNING_SECRET="..."
LYNXPAY_WEBHOOK_SECRET="..."
LYNXPAY_WEBHOOK_SECRET_PREVIOUS=""
LYNXPAY_BASE_URL="https://api.lynxpay.africa"
PLATFORM_COMMISSION_BPS="1000"
COMMISSION_RULE_VERSION="configurable-default-v1"
```

Use sandbox keys only; live credentials belong in a deployment secret store. In development,
leaving `LYNXPAY_API_KEY` and `LYNXPAY_SIGNING_SECRET` unset falls back to LynxPay's published
sandbox credentials, which only reach the simulation environment. Production accepts only a key
starting with `lynx_live_sk_`; without live credentials the storefront, accounts, and orders still
work, but starting a payment or refund fails with a configuration error. The
`LYNXPAY_WEBHOOK_SECRET` has no default: without it the webhook endpoint
returns 503 and orders can only advance through a server-side status check. Register
`https://<your-host>/api/webhooks/lynxpay` in the LynxPay dashboard and use the same signing secret
in `LYNXPAY_WEBHOOK_SECRET`.

Open `http://localhost:3000`. Health status is available at `GET /api/health`. Verification and
password-reset emails are sent over SMTP when the `SMTP_*` variables are set; otherwise they are
written to `.local/mail-outbox/` in development. Open the newest file to follow the link. Port 465
uses implicit TLS; other ports use STARTTLS when the server offers it. A Gmail account needs an app
password, not the account password. Verification links use `NEXT_PUBLIC_SITE_URL`, falling back to
`AUTH_URL` and then the Vercel deployment origin when it is left at localhost.

To run the PostgreSQL integration gates, point `TEST_DATABASE_URL` at a migrated database before
`npm run test`. CI starts a PostgreSQL 17 service and applies migrations before running the suite.
The local `prisma dev` server holds a single database session, so run the integration files
sequentially against it (`npx vitest run tests/integration --no-file-parallelism`); a normal
PostgreSQL instance has no such limit. LynxPay tests use a fake gateway and never call the network.

### Demo accounts

The seed is idempotent and safe to re-run. All demo accounts use the password `SupplyHub!2026`:

| Email                        | Role                                    |
| ---------------------------- | --------------------------------------- |
| `admin@supplyhub.test`       | Administrator (moderation, departments) |
| `customer@supplyhub.test`    | Customer                                |
| `studio@atelier-nord.test`   | Studio owner — Atelier Nord             |
| `studio@field-and-form.test` | Studio owner — Field & Form             |
| `studio@loom-house.test`     | Studio owner — Loom House               |

Seeded products, studios, and orders are demo content. The storefront banner and footer label the
catalogue as a preview, and payments run against the LynxPay sandbox in TZS.

## Deployment (Vercel + Supabase)

The app reads its database from `DATABASE_URL` or, when that is absent, from the Supabase keys
below. Key names are fixed: `SUPABASE_TRANSACTION_POOLER_KEY`, `SUPABASE_SESSION_POOLER_KEY`, and
`SUPPABASE_Direct_connection_KEY` (the misspelling is part of the deployed key name). The resolver
lives in `src/lib/config/database-url.ts`.

- A non-loopback `DATABASE_URL` always wins.
- On Vercel (`VERCEL=1`) or when `DATABASE_URL` points at localhost, the app prefers
  `SUPABASE_TRANSACTION_POOLER_KEY`; the pooler is forced to port 6543 for serverless connections.
- Migrations need a session connection. `vercel-build` runs `prisma generate && prisma migrate
deploy && next build`, and the Prisma config resolves the session pooler key on port 5432.
- Supabase's pooler presents a private CA, so Supabase URLs are rewritten to `sslmode=no-verify`
  (encrypted, certificate not verified). Remove that rewrite only if the CA is trusted by Node.
- Production refuses to start with a loopback `DATABASE_URL`.

Set these Vercel environment variables (Production and Preview): the three Supabase keys,
`AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL` (the deployed origin), and the LynxPay live keys once
available. For account verification and password recovery, add `SMTP_HOST`, `SMTP_USER`,
`SMTP_PASSWORD`, and optionally `SMTP_PORT`, `SMTP_SECURE`, and `EMAIL_FROM`. Payment credentials
are validated when a payment starts, not at build time, so a deployment without them still serves
the marketplace. `AUTH_URL` is optional on Vercel because Auth.js trusts the platform host there;
set it to the canonical origin if you serve the app from a custom domain through another proxy.
Local `DATABASE_URL`, `TEST_DATABASE_URL`, and the local `prisma dev` server are not used in
production.

Vercel's filesystem is ephemeral, so `.local/uploads` does not persist. Before enabling studio
uploads or seeding the hosted catalog, configure an S3-compatible bucket (the storage adapter
already has the S3 environment slots) or seed against persistent storage; otherwise demo images
served through `/media` return 404.

## Commands

| Command                            | Purpose                                  |
| ---------------------------------- | ---------------------------------------- |
| `npm run dev`                      | Start the development server             |
| `npm run build`                    | Production build                         |
| `npm start`                        | Serve the production build               |
| `npm run lint`                     | ESLint                                   |
| `npm run format`                   | Format with Prettier                     |
| `npm run format:check`             | Verify formatting                        |
| `npm run typecheck`                | TypeScript strict check                  |
| `npm run test`                     | Vitest unit and PostgreSQL integration   |
| `npm run db:generate`              | Generate the Prisma client               |
| `npm run db:migrate`               | Create and apply a development migration |
| `npm run db:deploy`                | Apply committed migrations in deployment |
| `npm run db:seed`                  | Seed demo accounts, studios, and catalog |
| `npm run db:studio`                | Open Prisma Studio                       |
| `npm run db:dev`                   | Run the local Prisma Postgres server     |
| `npm run admin:promote -- <email>` | Grant `ADMIN` to an existing account     |

## Project structure

```text
src/
  app/                 App Router routes, layouts, error boundaries, /media, and payment webhooks
  components/          UI primitives, storefront chrome, studio panels, and admin controls
  features/cart/       Guest and account carts, pricing summary, and cart actions
  features/catalog/    Catalog queries, search, money, validation, and studio/admin actions
  features/checkout/   Order placement, reservation release, order queries, and checkout UI
  features/identity/   Sign-up, sign-in, recovery, verification, and account queries
  features/payments/   Payment lifecycle, ledger, refunds, payouts, webhook handling, and actions
  features/vendors/    Vendor application, admin review, and studio queries
  generated/prisma/    Generated Prisma client (not committed)
  lib/config/          Validated environment configuration
  lib/logging/         Structured, redacting logger
  lib/security/        Redirect sanitizing and token format checks
  server/auth/         Auth.js configuration, session helpers, guards, and policies
  server/audit/        Vendor, product, department, and payment audit entries
  server/db/           Prisma client with the PostgreSQL driver adapter
  server/email/        Account email templates and the development outbox
  server/payments/     Payment gateway boundary, LynxPay client, amounts, and signatures
  server/security/     Fixed-window rate limiting for auth and payment endpoints
  server/storage/      Object storage adapters, generated keys, and image validation
  instrumentation.ts   Startup environment validation
prisma/
  schema.prisma        Users, vendors, catalog, carts, orders, payments, ledger, and payouts
  migrations/          Committed migration history
scripts/               Database seed and administrator bootstrap scripts
public/images/demo/    Source photography copied into storage by the seed
tests/                 Vitest unit tests and the opt-in PostgreSQL integration gates
docs/                  Product, architecture, security, and phase specifications
```

## Decisions and deviations

- **npm** is the package manager. The specification prefers pnpm when no convention exists, but
  pnpm is not installed in this environment; npm avoids adding global tooling. The lockfile is
  committed.
- **Prisma is pinned to 7.10.1.** The npm `latest` tag currently resolves to an 8.0 release
  candidate while the stable client is 7.10.1.
- **Auth.js v5 with the Credentials provider** was chosen from the documented options because it is
  self-contained: no external identity provider credentials exist in this environment. Additional
  providers can be added without changing the session model.
- **Sessions are JWTs, but authorization is read from PostgreSQL.** The session callback re-reads
  role, status, vendor status, and `sessionVersion` on every request. This keeps revocation and
  role changes immediate while avoiding a session table in this phase.
- **Authentication rate limits are in process memory.** They slow down credential stuffing in a
  single instance; a horizontally scaled deployment must move them to a shared store.
- **Account email uses SMTP with a development outbox fallback.** Verification and reset messages
  are sent through Nodemailer when `SMTP_*` credentials are configured. Without them, development
  writes owner-only files to `.local/mail-outbox/`, while production logs the missing configuration
  and sends nothing. Nodemailer 10 is pinned through npm `overrides`: Auth.js's optional email
  provider still declares a peer range of `^7 || ^8`, but the project does not use that provider and
  the older releases carry published advisories.
- **Catalog prices are integer cents in application code and `numeric` in PostgreSQL.** The Prisma
  schema stores `Decimal(12, 2)` with an explicit currency, and catalogue logic converts to integer
  cents before arithmetic so no floating point touches a price.
- **Variants are deferred.** Each object has one SKU and one stock count in this phase. The schema
  keeps stock on the product and history in `inventory_movements`; a variant model can be added
  later without changing the movement ledger's meaning.
- **Search is a SQL `contains` match on a normalized search column**, not PostgreSQL full-text
  search. The demo catalogue is small and this keeps ranking predictable; moving to `tsvector` and
  trigram indexes is a performance change, not a schema rewrite.
- **Image moderation is automatic and validation-based.** Accepted JPEG/PNG/WebP/GIF/AVIF/BMP files
  are auto-approved as `APPROVED`; the product-level review gate is human. A separate image
  moderation queue is not part of this phase.
- **Edits to published products go live immediately.** Administrators moderate the initial
  submission, not every subsequent edit. If continuous review becomes policy, published edits
  should move to a draft revision instead of mutating the live row.
- **Checkout is customer-only.** Vendor and administrator accounts keep operational roles and
  cannot place orders in this phase. Relax `canCheckout` when purchase policy is specified.
- **LynxPay is the only payment provider in this phase.** The catalogue moved from USD to TZS
  because LynxPay settles in Tanzanian shillings. The `PaymentGateway` interface keeps the provider
  behind one boundary, so a second provider needs an adapter plus status and amount mapping, not
  changes to checkout or the ledger.
- **The provider fee is charged on top of the order total.** LynxPay's request takes the merchant
  net and returns the gross customer charge plus fee. The customer pays the gross amount; the
  merchant ledger credits the order total, so vendor balances are not reduced by collection fees.
- **Commission is a configurable default, not business policy.** The platform keeps 1000 basis
  points under rule version `configurable-default-v1`. Arithmetic runs on integer cents with
  half-up rounding, and refunds allocate reversals by largest remainder. Both values are environment
  configuration until commission policy is decided.
- **Payment state advances only from verified provider evidence.** A hosted-page redirect, a
  client-supplied status, or an unsigned webhook never marks an order paid. Only a signature-verified
  webhook or an authenticated server-to-server status check does.
- **Payouts are manual records.** Administrators create, mark paid, and reconcile payouts in the
  dashboard; no disbursement API is integrated. Automated payouts can replace the manual step once
  transfer policy, KYC, and settlement timing are specified.
- **Reservations are released lazily.** Unpaid orders release their stock when an order page or
  checkout sweep runs. A production deployment should add a scheduled worker so abandoned
  reservations release even without traffic.
- **Guest carts are device-scoped and expire.** The database stores only a SHA-256 hash of the
  cart token; clearing cookies abandons the guest cart after its 30-day expiry.
- **The local Prisma dev server holds one database session.** Development therefore caps the
  driver pool at one connection in [src/server/db/client.ts](src/server/db/client.ts); deployed
  PostgreSQL uses the driver default. This workaround disappears once a normal PostgreSQL
  instance replaces `prisma dev`.
- **Motion is limited to entrance reveals and hover transitions.** No 3D is used yet; a selective
  3D moment can be evaluated later without changing this stack.
- **Next.js Cache Components** are enabled, matching the Next 16 scaffold. Route handlers remain
  request-time unless explicitly cached.
- **The Content Security Policy is report-only.** A nonce-based enforced policy is a Phase 9
  release requirement.
- **The local Prisma Postgres server is development-only.** Production requires a managed or
  self-hosted PostgreSQL instance with backups and restore testing.

## Security baseline

- Strict server-side environment validation fails closed at startup.
- Structured logs redact credentials, session data, and common personal data.
- Security headers include frame denial, MIME sniffing protection, a restrictive permissions
  policy, and HSTS in production.
- Health responses are `no-store` and never expose database error details.
- Passwords use Argon2id; sign-in spends the same work on unknown emails to avoid user enumeration.
- Verification and reset tokens are single-use, expire, and are stored only as hashes. Password
  resets revoke every other session.
- Every protected page and mutation calls a server-side guard. Client-supplied roles, vendor IDs,
  and statuses are never trusted.
- Catalog mutations resolve the studio from the session, never from the form, and re-check product
  ownership before writes. Uploaded files are validated by magic bytes, size-capped, and stored
  under server-generated keys; the media route serves only known image extensions and rejects
  traversal.
- Cart and checkout are server-authoritative: the browser sends only product IDs, quantities, and a
  delivery address. Prices, stock, currency, and totals are re-read from PostgreSQL in a locked
  transaction, and conditional stock updates prevent overselling under concurrency.
- Payment amounts are re-derived from the stored order and vendor orders, never from the request.
  Every attempt has a unique idempotency key, every provider payment ID and webhook delivery is
  unique, and state changes run inside a transaction that re-checks the current status.
- The LynxPay webhook verifies an HMAC over the raw body and timestamp before parsing, enforces a
  bounded replay window, accepts a previous secret only during rotation, caps the request size, and
  records deliveries so replays cannot double-apply. Rejected requests return a status code without
  echoing provider or personal data.
- Provider API keys and webhook secrets are read only through `getServerEnv()`; the hosted checkout
  URL is rejected unless it is HTTPS on `lynxpay.africa`. Payment initiation and status polling are
  rate limited per customer.
- Commission, refund, and payout amounts are computed on the server from integer money and written
  as append-only ledger entries. Administrators reconcile against the ledger, and the dashboards
  flag rows whose customer charge, provider fee, refunds, and ledger net do not add up.
- Redirect targets from `next` parameters pass through `safeNextPath`, and forms use server actions
  with Auth.js cookie protections.
