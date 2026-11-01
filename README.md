# SupplyHub

A premium multi-vendor marketplace built with Next.js 16, TypeScript, Tailwind CSS, PostgreSQL,
Prisma, and a server-first security model.

## Status

Phase 4 (catalog and inventory) is complete. Studios create and edit their own objects, upload
validated photography, submit them for review, and adjust stock with a recorded movement history.
Administrators moderate submissions, curate the featured edit, and manage departments. The
storefront now reads published catalog data from PostgreSQL. Checkout, payments, and PWA phases
follow the gates in [docs/07-development-phases.md](docs/07-development-phases.md).

The Phase 3 gate is covered by unit tests that prove customers, vendors, and administrators cannot
read or mutate another user's or studio's private resources, including suspended accounts,
pending or rejected applications, and order access across vendors. The Phase 4 gate adds tests for
vendor product isolation, generated storage keys, image type and size validation, search query
parsing, and inventory constraints.

## Catalog and inventory (Phase 4)

- Products are owned by exactly one studio. Every studio write scopes by the session's vendor ID
  server-side; another studio's product ID returns 404. Image uploads, stock adjustments, edits,
  submission, and withdrawal all re-check ownership.
- New objects start as `DRAFT`. A studio submits work to `PENDING_REVIEW`, may withdraw it back to
  draft, and may not edit an object while it is in review; stock can still be adjusted so the
  inventory stays accurate. Administrators publish or return an object with a reason, and every
  decision is written to the audit log.
- Uploads accept JPEG, PNG, or WebP up to 5 MB, verified by magic bytes rather than the declared
  MIME type. Keys are generated server-side as `products/<productId>/<uuid>.<ext>`, so a client
  cannot choose a path, overwrite another object's image, or upload SVG or executable content.
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
- Email delivery is a development-only file outbox at `.local/mail-outbox/`; no production email
  provider is configured yet.
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
- Every surface still labels the catalogue as a preview, and "add to cart" explains that checkout
  is not connected instead of simulating an order.
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

Open `http://localhost:3000`. Health status is available at `GET /api/health`. Verification and
password-reset emails are written to `.local/mail-outbox/` in development; open the newest file to
follow the link.

### Demo accounts

The seed is idempotent and safe to re-run. All demo accounts use the password `SupplyHub!2026`:

| Email                        | Role                                    |
| ---------------------------- | --------------------------------------- |
| `admin@supplyhub.test`       | Administrator (moderation, departments) |
| `customer@supplyhub.test`    | Customer                                |
| `studio@atelier-nord.test`   | Studio owner — Atelier Nord             |
| `studio@field-and-form.test` | Studio owner — Field & Form             |
| `studio@loom-house.test`     | Studio owner — Loom House               |

Seeded products and studios are demo content; the storefront banner and footer repeat that no
orders are processed.

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
| `npm run test`                     | Vitest unit tests                        |
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
  app/                 App Router routes, layouts, error boundaries, and /media
  components/          UI primitives, storefront chrome, studio panels, and admin controls
  features/catalog/    Catalog queries, search, money, validation, and studio/admin actions
  features/identity/   Sign-up, sign-in, recovery, verification, and account queries
  features/vendors/    Vendor application, admin review, and studio queries
  generated/prisma/    Generated Prisma client (not committed)
  lib/config/          Validated environment configuration
  lib/logging/         Structured, redacting logger
  lib/security/        Redirect sanitizing and token format checks
  server/auth/         Auth.js configuration, session helpers, guards, and policies
  server/audit/        Vendor, product, and department decision audit entries
  server/db/           Prisma client with the PostgreSQL driver adapter
  server/email/        Account email templates and the development outbox
  server/security/     Fixed-window rate limiting for auth endpoints
  server/storage/      Object storage adapters, generated keys, and image validation
  instrumentation.ts   Startup environment validation
prisma/
  schema.prisma        Users, vendors, categories, products, images, and stock movements
  migrations/          Committed migration history
scripts/               Database seed and administrator bootstrap scripts
public/images/demo/    Source photography copied into storage by the seed
tests/                 Vitest unit tests
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
- **Account email is file-based in development.** Verification and reset messages are written to
  `.local/mail-outbox/` with owner-only permissions. Production delivery remains unconfigured and
  is a deployment blocker for self-service recovery.
- **Catalog prices are integer cents in application code and `numeric` in PostgreSQL.** The Prisma
  schema stores `Decimal(12, 2)` with an explicit currency, and catalogue logic converts to integer
  cents before arithmetic so no floating point touches a price.
- **Variants are deferred.** Each object has one SKU and one stock count in this phase. The schema
  keeps stock on the product and history in `inventory_movements`; a variant model can be added
  later without changing the movement ledger's meaning.
- **Search is a SQL `contains` match on a normalized search column**, not PostgreSQL full-text
  search. The demo catalogue is small and this keeps ranking predictable; moving to `tsvector` and
  trigram indexes is a performance change, not a schema rewrite.
- **Image moderation is automatic and validation-based.** Accepted JPEG/PNG/WebP files are
  auto-approved as `APPROVED`; the product-level review gate is human. A separate image moderation
  queue is not part of this phase.
- **Edits to published products go live immediately.** Administrators moderate the initial
  submission, not every subsequent edit. If continuous review becomes policy, published edits
  should move to a draft revision instead of mutating the live row.
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
- Redirect targets from `next` parameters pass through `safeNextPath`, and forms use server actions
  with Auth.js cookie protections.
