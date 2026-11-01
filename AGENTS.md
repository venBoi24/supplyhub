<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# SupplyHub Agent Guide

SupplyHub is a multi-vendor marketplace. The authoritative product, architecture, security, and
phase requirements live in `docs/`. Read `docs/07-development-phases.md` and
`docs/08-security.md` before making changes, and respect phase gates.

## Commands

```bash
npm run dev            # development server
npm run build          # production build
npm run lint           # ESLint
npm run format:check   # Prettier check
npm run typecheck      # tsc --noEmit
npm run test           # Vitest
npm run db:migrate     # Prisma migration (development)
npm run db:deploy      # apply migrations (deployment)
```

Run `format:check`, `lint`, `typecheck`, `test`, and `build` before reporting work complete.

## Non-negotiable rules

- Use npm and commit `package-lock.json`. Do not introduce pnpm, Yarn, Bun, or a second ORM.
- Keep TypeScript strict. Do not use `any` without a documented reason.
- Default to server components. Add `"use client"` only where browser APIs or interactivity
  require it.
- Enforce authorization on the server for every protected read and mutation. Never trust a role,
  vendor ID, price, status, or total supplied by the client.
- Validate all untrusted input with Zod at the server boundary.
- Store money as PostgreSQL `numeric` via Prisma `Decimal`; never use floating point. Store
  currency explicitly.
- Keep Prisma pinned to 7.10.1 until an approved upgrade. The `latest` tag is an 8.0 release
  candidate.
- Access server secrets only through `getServerEnv()` in `src/lib/config/env.ts`. Never expose
  secrets or private data to the client or service-worker caches.
- Use `src/lib/logging/logger.ts` for structured logs. Never log credentials, tokens, payment
  data, or unnecessary personal information.
- Do not invent business policy. Currency, tax, shipping, commission, refunds, and vendor
  verification remain unresolved in `docs/01-product-vision.md`; use clearly marked configurable
  defaults.
- Do not add a second animation library, authentication library, or UI kit. Motion for React,
  Lucide, and accessible Radix/shadcn primitives are the approved choices when their phase
  begins.
- Keep PWA caching to public, versioned assets and explicitly reviewed catalog responses. Never
  cache authenticated, checkout, payment, vendor, admin, or order responses.
- Record migrations in `prisma/migrations`; never edit applied migrations.
