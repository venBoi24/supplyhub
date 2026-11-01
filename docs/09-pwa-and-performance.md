# 9. PWA, Offline Behavior and Performance

## PWA outcomes

The marketplace should be installable on supported browsers, launch with
a suitable app icon and theme, feel responsive on mobile, and provide a
useful offline fallback. A PWA is still a web application; install
prompts and background features vary by browser and operating system.

## Required implementation

-   valid web app manifest with name, short name, description, start
    URL, scope, display mode, theme color and background color;
-   correctly sized app icons, including appropriate maskable icon where
    supported;
-   HTTPS in production;
-   service worker using a maintained approach compatible with the
    selected Next.js version;
-   offline fallback page explaining that network connectivity is
    required for live product/order data;
-   install experience only where the browser supports it, with a
    dismissible prompt and no coercive nagging;
-   app update strategy that avoids silently breaking active checkout
    sessions;
-   tests for first load, repeat load, offline fallback and new-version
    activation.

## Caching policy

Safe candidates: versioned static assets, fonts, public CSS/JS, and
selected public catalog responses with a short, explicit freshness
policy.

Do not cache in shared or persistent service-worker caches:
authentication endpoints, session data, private profiles, addresses,
cart/checkout responses, payment pages, vendor dashboards, admin data,
private order details or sensitive API responses. Avoid caching
personalized API data unless a reviewed strategy includes correct user
isolation and invalidation.

Offline behavior must never pretend that a payment, order placement,
inventory update or payout succeeded. If offline, clearly explain that
the action requires a connection.

## Performance priorities

-   Server-render content that benefits from initial HTML and search
    indexing.
-   Use Next.js image optimization or a compatible image pipeline.
-   Serve responsive images and appropriate modern formats.
-   Lazy-load below-the-fold images and optional 3D/animation content.
-   Avoid unnecessary client components and large client-side libraries.
-   Use dynamic imports for optional heavy features.
-   Avoid layout shift by reserving image/media dimensions.
-   Use pagination or bounded queries for large catalogs.
-   Add database indexes based on measured query patterns.
-   Monitor Core Web Vitals and production errors.

## Suggested budgets

Use as initial targets and revise based on real measurements: - aim for
good Core Web Vitals at the 75th percentile: LCP \<= 2.5s, INP \<=
200ms, CLS \<= 0.1; - keep initial client JavaScript modest and avoid
loading 3D on checkout/auth/dashboard routes; - optimize product imagery
and font loading; - set and monitor page-specific bundle and image
budgets.

## 3D and animation performance

Use 3D only when it adds measurable brand or product value. Provide
static fallback imagery, lazy loading, off-screen pause and
reduced-motion behavior. On low-power devices or save-data conditions,
prefer the static version. Keep motion nonessential to completing a
task.
