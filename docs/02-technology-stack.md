# 2. Technology Stack and Responsibilities

## Core stack

  -----------------------------------------------------------------------
  Layer                   Choice                  Responsibility
  ----------------------- ----------------------- -----------------------
  Language                TypeScript, strict mode Type safety across
                                                  application code

  Frontend framework      Next.js App Router      Routing, server
                                                  rendering, layouts,
                                                  server/client component
                                                  boundaries

  UI library              React                   Reusable interactive
                                                  components

  Styling                 Tailwind CSS            Responsive utilities
                                                  and design tokens

  Accessible primitives   shadcn/ui with Radix UI Dialogs, menus,
                          primitives, selectively popovers, forms and
                                                  accessible interaction
                                                  patterns

  Icons                   Lucide React            Consistent, crisp
                                                  interface icons

  Motion                  Motion for React        Page transitions and
                          (`motion`)              micro-interactions

  Optional 3D             Spline embeds or        Small hero/product
                          optimized GLB assets    storytelling moments;
                          with Three.js/React     not routine UI controls
                          Three Fiber only where  
                          justified               

  Forms                   React Hook Form + Zod   Form state and schema
                                                  validation

  Database                PostgreSQL              Relational marketplace
                                                  data and transaction
                                                  integrity

  ORM                     Prisma ORM              Typed database access
                                                  and migrations; choose
                                                  Drizzle instead only if
                                                  the repository already
                                                  standardizes on it

  Authentication          Auth.js or one vetted   Identity, sessions and
                          managed provider        OAuth where needed

  API validation          Zod                     Validate request
                                                  payloads, query params
                                                  and environment
                                                  variables

  File storage            S3-compatible object    Product photos and
                          storage                 other permitted media

  Search                  PostgreSQL full-text    Search product
                          search for MVP          names/descriptions
                                                  without adding
                                                  infrastructure
                                                  prematurely

  Cache/queue             Add Redis or a managed  Rate limits, jobs and
                          queue only when a       cache coordination
                          demonstrated need       
                          exists                  

  Unit/component tests    Vitest + React Testing  Business logic and UI
                          Library                 behavior

  End-to-end tests        Playwright              Core
                                                  customer/vendor/admin
                                                  workflows

  Code quality            ESLint + Prettier +     Consistent code and
                          TypeScript checks       static checks

  Observability           Structured logs plus an Diagnose production
                          error monitoring        failures without
                          service                 logging secrets

  CI                      GitHub Actions or       Repeatable checks and
                          existing CI             build verification

  Deployment              Node-compatible         Production hosting and
                          platform + managed      managed infrastructure
                          PostgreSQL + object     
                          storage                 
  -----------------------------------------------------------------------

## Architecture decision

Start with a **modular monolith**, not microservices. Next.js can host
the frontend and server-side application logic through Route Handlers
and Server Actions. Keep business rules in service modules so they can
later be moved behind a separate API if scale or team structure requires
it.

Suggested domains: identity, vendors, catalog, inventory, cart,
checkout, orders, payments, commissions, payouts, reviews, notifications
and administration.

## Package discipline

-   Verify compatibility with the selected Next.js version before
    installation.
-   Use one package manager and commit its lockfile.
-   Do not add both Prisma and Drizzle.
-   Do not add multiple animation libraries for the same purpose.
-   Use `pnpm` if the repository has no package-manager convention;
    otherwise preserve the existing manager.
-   Pin or constrain dependencies appropriately and keep them updated.
-   Document why any heavyweight dependency is needed.

## Environment configuration

Create `.env.example` with variable names and safe placeholders. Typical
variables may include: - `DATABASE_URL` - authentication secret/provider
configuration - object storage endpoint, bucket and credentials -
payment-provider sandbox/live configuration - public site URL - email
provider configuration - optional monitoring DSN

Never commit a real `.env` file or credentials. Validate required
environment variables at startup and fail with a clear, secret-safe
error.

## Backend clarification

PostgreSQL is the database, not the backend application by itself. The
backend consists of server-side Next.js handlers/actions, service
modules, validation, authorization and database access through the ORM.
Keep database credentials server-only.
