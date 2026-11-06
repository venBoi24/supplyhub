# SupplyHub Storefront and Seller Studio Redesign

- Status: Proposed — awaiting review
- Date: 2026-11-06
- Scope: buyer storefront and seller studio
- Reference: concept mockup reviewed 2026-11-06 (storefront, product page, seller top tabs, design system)

## 1. Summary

Redesign the buyer storefront and the seller studio into a modern commerce experience modeled on
the structure of Shopify Dawn (storefront) and the density of Shopify Polaris (seller operations),
while keeping SupplyHub's existing identity: navy, orange, Bricolage Grotesque display type, and
Geist interface type.

The redesign is visual and presentational. It does not change database schema, migrations, queries,
authentication, payments, email, object storage, routes, server actions, or business rules. Admin
screens keep their current layout and inherit only the refreshed tokens.

The seller area keeps **top-tab navigation**; a sidebar is explicitly rejected.

## 2. Goals

1. Make the storefront feel like a credible, premium multi-vendor marketplace: photography-led,
   quiet chrome, obvious hierarchy, fast scanning.
2. Give the seller studio a dense, calm operations surface: top tabs, KPI cards, readable tables,
   clear status.
3. Keep every existing feature, route, form field, and permission exactly as it works today.
4. Add supporting color without losing the navy/orange identity.
5. Preserve light and dark themes with WCAG 2.2 AA contrast where practical.

### Success criteria

- A first-time visitor can identify the marketplace, search, browse departments, open an object,
  and add it to the cart without the interface competing with the photography.
- A seller can reach Overview, Products, Orders, Earnings, and Studio profile in one click from the
  studio header, with the active tab unmistakable.
- No regression in any existing flow: sign-up, vendor application, product draft, image upload,
  submission, checkout, delivery choice, order status, earnings, payout history.
- `format:check`, `lint`, `typecheck`, `test`, and `build` pass.
- Storefront and seller studio are usable at 360 px, 768 px, 1024 px, and 1280 px in both themes.

## 3. Non-goals and constraints

- No Prisma schema, migration, seed, or query-contract changes.
- No `.env` changes and no new environment variables.
- No changes to auth, sessions, roles, rate limits, payments, email, or S3/Supabase storage.
- No new pages, routes, server actions, or capabilities.
- No new dependencies. Native `<details>` is used for product accordions. Motion for React, Lucide,
  and Radix/shadcn primitives remain the approved libraries.
- Admin layout is not redesigned. Admin screens inherit token and typography changes and must be
  visually checked for regressions.
- Marketing copy must describe existing capabilities only. Do not invent shipping, return, tax,
  warranty, or payout promises.
- Money remains `Prisma.Decimal`/`numeric`; no price or total handling changes.

## 4. Visual direction

Shopify Dawn's structural discipline — white canvas, hairline borders, large imagery, four-up grids,
restrained chrome — paired with SupplyHub's own type and color. Not a clone: no Liquid-style
sections, no shop-specific branding, no new merchandising modules.

Design principles:

1. Photography is the primary surface; UI recedes.
2. One action color (orange) and one structure color (navy); supporting tones are quiet.
3. Borders and spacing create hierarchy; shadows only on hover or overlays.
4. Dense where sellers work, generous where buyers browse.
5. Motion confirms actions and orientation; it never delays a task.

### 4.1 Palette

Keep the existing semantic token names so current classes keep working. Re-point `mint`, `clay`,
`clay-soft`, `paper`, and `paper-foreground` to the new supporting tones rather than deleting them;
they are referenced in 22 files.

Light theme:

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#F5F6F8` | Page canvas |
| `--surface` | `#FFFFFF` | Cards, header, panels |
| `--surface-muted` | `#EFF1F4` | Hover fills, table headers |
| `--surface-sunken` | `#E7EAEF` | Wells, image placeholders |
| `--border` | `#E4E7EC` | Hairlines |
| `--border-strong` | `#CFD5DF` | Hover borders, dividers |
| `--foreground` | `#0B1020` | Primary text |
| `--muted-foreground` | `#5C6678` | Secondary text |
| `--primary` | `#101A3A` | Navy structure, footer, announcement |
| `--primary-foreground` | `#FFFFFF` | Text on navy |
| `--accent` | `#F97316` | Primary action, sale, focus identity |
| `--accent-hover` | `#EA580C` | Accent hover |
| `--accent-foreground` | `#0B1020` | Text on orange (AA) |
| `--accent-ink` | `#C2410C` | Accent text/links on white (AA) |
| `--accent-soft` | `#FFF1E8` | Accent wash |
| `--sage` | `#5F7F6A` | Supporting tone, success-adjacent labels |
| `--sage-soft` | `#E8EFE9` | Category tile, icon wash |
| `--sand` | `#EFE4D3` | Category tile, editorial panel |
| `--sand-soft` | `#F8F2E9` | Soft panel, gallery background |
| `--sand-ink` | `#6B5337` | Text on sand |
| `--sky` | `#E5EEF8` | Category tile, info-adjacent panel |
| `--sky-ink` | `#365A7D` | Text on sky |
| `--success` / soft | `#166534` / `#E7F4EC` | Positive status |
| `--warning` / soft | `#B45309` / `#FDF1E3` | Attention status |
| `--danger` / soft | `#B91C1C` / `#FDEAEA` | Destructive status |
| `--info` | `#1D4ED8` | Informational |
| `--ring` | `#EA580C` | Focus ring |

Dark theme:

| Token | Value |
| --- | --- |
| `--background` | `#080C16` |
| `--surface` | `#0F1524` |
| `--surface-muted` | `#141C2E` |
| `--surface-sunken` | `#0B1120` |
| `--border` | `#233049` |
| `--border-strong` | `#3A4966` |
| `--foreground` | `#EEF1F7` |
| `--muted-foreground` | `#A7B1C7` |
| `--primary` | `#1C2A52` |
| `--primary-foreground` | `#FFFFFF` |
| `--accent` | `#FB923C` |
| `--accent-hover` | `#F97316` |
| `--accent-foreground` | `#0B1020` |
| `--accent-ink` | `#FDBA74` |
| `--accent-soft` | `#2A1A10` |
| `--sage` / soft | `#8FB59B` / `#16251C` |
| `--sand` / soft / ink | `#2A2117` / `#1E1811` / `#D8BF9E` |
| `--sky` / ink | `#162333` / `#A9C6E2` |
| `--success` / soft | `#4ADE80` / `#12251A` |
| `--warning` / soft | `#FBBF24` / `#2A2011` |
| `--danger` / soft | `#F87171` / `#2A1414` |
| `--info` | `#60A5FA` |
| `--ring` | `#FB923C` |

Color rules:

- Navy is structure; orange is action. Never use orange for large body copy or as a section
  background.
- Sage, sand, and sky appear in category tiles, editorial panels, icon washes, and soft status.
  They never replace the primary action color.
- Orange text on white uses `--accent-ink`, not `--accent`.
- Orange buttons and badges use ink text. White on `#F97316` fails AA at normal sizes.
- Status is never conveyed by color alone: pair the tone with a label or icon.
- Compatibility aliases keep existing classes working: `--mint` → `--sage`, `--clay` → `--sand-ink`,
  `--clay-soft` → `--sand`, `--paper` → `--sand-soft`, `--paper-foreground` → `--sand-ink`.

### 4.2 Typography

- Display: Bricolage Grotesque (existing `--font-display`), weight 600, tracking `-0.035em` to
  `-0.045em`.
- Interface: Geist (existing `--font-sans`), weights 400/500/600.
- Data: Geist Mono for SKUs, order numbers, dashboard labels, eyebrows.
- Scale: 11 eyebrow; 12 small; 13 body-compact (seller); 14 body; 16 lead; 20 section; 26 page
  heading; 38 product title; 48 hero desktop; 30 hero mobile.
- Display line height 1.02–1.12; body 1.55–1.7. Prices and table figures use tabular numerals.
- Eyebrows: 10–11 px, uppercase, letter-spacing `0.14em`.

### 4.3 Shape, spacing, elevation

- Base radius `0.5rem`; controls 8 px; cards and panels 12 px; hero media 16 px; pills 999 px.
- Spacing unit 4 px. Page gutter 24 px desktop / 16 px mobile. Content max width 1180 px.
- Section rhythm: 64 px desktop, 48 px tablet, 32 px mobile.
- Shadows: none at rest on cards; `0 1px 2px rgba(11,16,32,.05)` plus a soft lift on hover;
  overlays use the existing dialog/sheet shadow.
- Borders: 1 px `--border`. No double borders around tables inside panels.

### 4.4 Motion

- 150–220 ms, ease-out. Hover: image scale 1.02–1.03, border darkens, no layout shift.
- Entrance: one short fade/translate per section on first view; no scroll hijacking.
- Cart count and add-to-cart feedback animate briefly.
- Respect `prefers-reduced-motion`; remove transforms and entrances, keep state changes.

## 5. Component system

| Component | Change |
| --- | --- |
| `Button` | Navy `primary`, orange `accent` with ink text, bordered `secondary`, `ghost`, `link`, `destructive`. Heights 36/42/48, radius 8, medium weight. |
| `Badge` / pills | Tones neutral, accent, success, warning, danger, info. Availability and sale pills use a dot plus label. |
| `Input`, `Select`, `Field` | 42 px height, radius 8, 12 px label, 11 px hint, inline error below. Focus ring 2 px orange with offset. |
| `Notice`, `EmptyState` | Surface card, 12 px radius, 1 px border, tone icon wash, clear title and one action. |
| Cards / panels | White surface, hairline border, 12 px radius. Hover lift only on interactive cards. |
| `ProductCard` | 4:5 media, second image on hover, sale badge top-left, vendor 11.5 px muted, title 13.5–14 px medium, price 13–14 px semibold. No quick-add (not an existing capability). |
| `SectionHeading` | Eyebrow, 26 px heading, optional right action link. |
| `PageShell` | Max 1180 px, 24/16 px gutters, consistent top spacing. |
| Header | Announcement strip 32 px navy; main bar 66–68 px white with hairline; logo left; nav with orange underline; pill search; account and cart. Mobile: menu, logo, cart; search entry. |
| Footer | Navy, four columns, 11–12 px links, hairline divider, existing content only. |
| Seller shell | Studio bar 64 px (logo, studio, status, View storefront, Add object) plus a 44 px top-tab row; active tab orange underline. Content max 1180 px. No sidebar. |
| Tables | 11 px uppercase headers on `surface-muted`, 44 px rows, tabular numerals, hairline row dividers, hover. Horizontal scroll stays inside the panel. |
| Dialogs / sheets | Existing Radix behavior; tokens, radius, and motion aligned. |
| Skeletons | Neutral blocks matching final layout; never look like real data. |

## 6. Page specifications

### Storefront

**Home**

1. Announcement strip and header.
2. Hero: full-width navy panel with photography/gradient art, eyebrow, 48 px headline, one-sentence
   lead, accent "Shop all objects" and outlined "Meet the studios". Existing `HeroSlider` behavior
   is kept and restyled as an overlay slider with dots.
3. Trust strip: four items drawn from existing capabilities (distance-based delivery, secure
   checkout, named makers, studio-direct orders).
4. Departments: four image tiles with sage/sand/sky/navy backgrounds, name and short descriptor.
5. Featured objects: four-up `ProductCard` grid using existing featured products.
6. Studio spotlight: image plus sand-toned editorial panel, first studio and one object image.
7. Value cards: three benefits (provenance, product detail, delivery), existing copy adapted.
8. Navy closing CTA band and footer.

**Catalog, search, category**

- Page title, result count, existing filter and sort controls restyled as a single bar with chips.
- Four-up grid desktop, two-up mobile, existing pagination.
- Empty state for no matches; no filter capabilities added.

**Product detail**

- Breadcrumb; two-column layout at `lg`.
- Gallery: 4:5 main image, four thumbnails, existing images only.
- Buy box: maker row, 38 px title, price with sale, availability pill, quantity stepper, full-width
  orange add-to-cart, delivery note.
- Details accordions using native `<details>`: details/materials, care, delivery and returns, maker.
  Content comes from existing fields and existing delivery copy.
- Trust row; related objects grid.
- Buy box is sticky on desktop only (`lg`); no sticky behavior on mobile.

**Cart**

- Two-column layout: line items (96–112 px image, name, studio, quantity stepper, price, remove)
  and a sticky summary card (subtotal, delivery, total, checkout, continue shopping).
- Empty state with a catalog action.
- Existing totals and checkout actions only.

**Checkout and delivery**

- Two-column: form card and sticky summary card; section headings with hairline dividers.
- Existing fields, validation, delivery choice, map field, and payment panel styling updated only.
- Errors inline below fields; summary error state preserved.

**Order detail, account, auth**

- Order detail: summary card, line items, address and status panels; same data.
- Account: profile card, verification state, orders, security actions in clean sections.
- Auth: split layout, navy brand panel with three proof points on `lg`, form card on the right;
  single column on mobile. Existing fields and flows.

**Studios**

- Index: intro, two-up/three-up studio cards with monogram, location, object count.
- Studio detail: banner/monogram header, story, departments, object grid, maker label treatment.

### Seller studio

Top-tab shell, confirmed. No sidebar.

- **Studio bar:** SupplyHub mark, divider, studio monogram/name/owner, Approved status,
  "View storefront", "Add object". On small screens hide the studio block, status, and secondary
  button; keep the mark and primary action; hide the wordmark below 430 px.
- **Tabs:** Overview, Products, Orders, Earnings, Studio profile. 44 px height, active orange
  underline, horizontal scroll inside the nav on narrow screens.
- **Overview:** page heading and four KPI cards (objects, published, in review, low stock). Main
  column keeps the existing studio object list. Right rail adds "Needs attention" (pending review,
  low stock, profile completeness) and a compact "Recent orders" list built from the existing
  `listVendorOrders` query. This is the only content re-composition: it reads the same vendor data
  through existing queries and adds no capability, schema, route, or action.
- **Products:** header with "New object"; list rows with thumbnail, name, SKU, department, status,
  price, stock, updated date. No new filters.
- **Product new/edit:** two-column form and image panel; sticky action bar on desktop; existing
  fields, preview, upload, submit, archive, delete, inventory controls.
- **Orders:** header with CSV export, restyled order cards with items, totals, status form.
- **Earnings:** four metric cards, payout history table, empty state.
- **Studio profile:** sections for location, departments, story, monogram; single save action.
- **Application and status states:** pending, rejected/appeal, and approved states restyled with
  notices and status cards; same actions.

### Admin

No layout work. Verify header/footer, tables, forms, badges, and dialogs after token changes.

## 7. Dark mode

- Translate the same hierarchy; no pure black; elevated surfaces use `surface` against
  `background`.
- Re-check all status tones and chartless tables for contrast.
- Product imagery and brand colors stay unchanged.
- Every redesigned screen is reviewed in both themes.

## 8. Accessibility and responsive behavior

- Target WCAG 2.2 AA. Orange text uses `--accent-ink`; orange buttons use ink text.
- All controls reachable and operable by keyboard; visible focus ring on every interactive element.
- Touch targets at least 44×44 px where practical, never below 32 px on fine pointers.
- Forms keep labels, hints, and inline errors; errors use `role="alert"` where already present.
- Status uses label plus tone, never color alone.
- No horizontal page overflow at 360 px. Tables scroll inside their own container.
- Respect 200% zoom and reduced motion.
- Preserve landmarks, heading order, and existing `aria` attributes.

## 9. Implementation map

**Tokens and primitives**

- `src/app/globals.css`: light/dark tokens, radii, shadows, section utilities, motion keyframes.
- `src/components/ui/*`: button, badge, input, select, field, notice, empty-state, price, skeleton,
  dialog, sheet, toaster, paged-nav.

**Storefront components**

- `page-shell`, `wordmark`, `announcement-bar`, `site-header`, `site-footer`, `mobile-nav`,
  `department-menu`, `search-form`, `account-menu`, `account-menu-view`, `cart-link`,
  `product-card`, `product-grid`, `section-heading`, `studio-card`, `maker-label`,
  `availability-badge`, `hero-slider`, `sort-links`, `filter-chip`, `pagination`, `quantity-stepper`,
  `share-button`, `skeletons`.

**Storefront pages**

- Home, products, search, categories, vendors index/detail, product detail, cart, checkout,
  delivery, order detail, account, sign-in, sign-up, forgot/reset password, verify email.

**Seller**

- `src/components/vendor/*`: studio-nav (top tabs), product-status-badge, inventory-panel,
  product-images-panel, order-status-form, location-map-field.
- `src/components/vendors/*`: application form, appeal form, status badge.
- Seller pages: overview, products, product new/edit, orders, earnings, profile, apply.
- `vendor/page.tsx` imports the existing `listVendorOrders` for the recent-orders panel.

**Docs**

- Update `docs/03-visual-design-system.md` to match the shipped palette, type, layout, motion, and
  Dawn/Polaris references.

## 10. Delivery phases

0. Baseline: capture current screenshots; establish tokens, radii, shadows, and primitives.
1. Storefront chrome: header, announcement, mobile nav, search, account/cart, footer, page shell.
2. Home.
3. Catalog, search, categories, studios.
4. Product detail, cart.
5. Checkout, delivery, order detail, account, auth.
6. Seller shell, overview, products, product forms, orders, earnings, profile, application states.
7. QA, admin regression check, documentation update, final verification.

Each phase ends with a runnable app and a visual check; no phase depends on schema or env changes.

## 11. Verification

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- Visual QA at 360, 768, 1024, 1280, and 1440 px in light and dark.
- Keyboard pass on header menus, filters, gallery, accordions, forms, seller tabs, tables.
- Contrast check for orange text/buttons, muted text, status pills, and dark surfaces.
- Reduced-motion pass.
- `git diff` review confirming no changes under `prisma/`, no `.env`, and no feature/action changes.
- Confirm existing unit tests pass unchanged; add tests only if a presentational change alters
  observable behavior (none expected).

## 12. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Scope creep across 30+ routes | Token-first phases, shared primitives, stop at the agreed page list. |
| Dark-mode regressions | Token-driven styling; both themes checked per phase. |
| Orange contrast failures | Ink-on-orange buttons, `--accent-ink` for text, automated contrast check. |
| Header/footer Suspense behavior changes | Styling only; keep server components and Suspense boundaries. |
| Seller dashboard content drift | Only existing queries; recent-orders panel flagged for review. |
| Admin visual regressions | No layout edits; regression pass after tokens land. |
| Sticky buy box or accordions harming mobile | Sticky only at `lg`; native `<details>` with keyboard support. |
| Image and S3 behavior affected | No storage or URL changes; `next/image` usage preserved. |

## 13. Acceptance criteria

- Storefront and seller studio match the approved concept: white canvas, hairline borders,
  photography-led grids, navy/orange identity, sage/sand/sky support tones.
- Seller uses top tabs and no sidebar.
- Every existing route, permission, form field, action, and flow works unchanged.
- No changes to Prisma schema, migrations, `.env`, auth, payments, email, or storage.
- `format:check`, `lint`, `typecheck`, `test`, and `build` pass.
- Light and dark themes pass visual QA at 360–1440 px.
- Keyboard, focus, contrast, reduced motion, and no-horizontal-overflow checks pass.
- Admin screens show no regressions.

## 14. Resolved decisions

- Direction: Shopify Dawn structure, SupplyHub identity.
- Palette: keep navy and orange; add sage, sand, and sky as supporting tones.
- Theme: keep light and dark, light-first.
- Scope: storefront and seller studio; admin layout untouched.
- Seller navigation: top tabs, not a sidebar.
- Typography: keep Bricolage Grotesque and Geist.
- No new dependencies; native `<details>` for accordions.
- Orange buttons use ink text; white-on-orange is rejected for AA contrast.
