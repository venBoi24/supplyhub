# 3. Visual Design System and Interaction Direction

## Design goal

Build a recognizable, premium marketplace experience: editorial product
photography, clean composition, high-contrast typography, calm surfaces,
strong search, and small moments of motion. Avoid a generic admin
template appearance.

## Proposed visual direction

-   Primary: deep indigo/navy for trust and structure.
-   Accent: vivid electric blue for primary actions and focus.
-   Secondary accent: teal or mint for positive status and selected
    highlights.
-   Background: cool off-white/light gray in light mode; deep
    blue-charcoal in dark mode.
-   Surface: white or elevated charcoal, with subtle borders.
-   Status colors: accessible success, warning, error and informational
    tokens.
-   Reserve gradients for selected hero areas or promotional accents; do
    not put gradients on every card.
-   Product photography should be the main visual attraction. Use
    consistent aspect ratios and object-fit rules.

Treat these as initial design direction, not hard-coded scattered
values. Create CSS variables/design tokens and allow refinement after
reviewing actual screens.

## Typography

Use a readable UI font such as Geist or Inter, with a strong but
restrained type scale. Use clear headings, short line lengths, tabular
numerals for prices and metrics, and consistent font weights. Avoid tiny
low-contrast helper text.

## Layout and components

-   Storefront: clear header, visible search, category navigation,
    curated hero, product grids, trust/delivery messaging and a
    deliberate footer.
-   Product card: high-quality image, concise title, price, sale price
    only when real, vendor identity where useful, availability and
    accessible quick actions.
-   Product detail: prominent gallery, clear price, variant selection,
    quantity, stock status, delivery/returns information and primary
    add-to-cart action.
-   Dashboards: predictable sidebar/topbar, concise KPI cards, readable
    tables, filters, pagination and clear empty states.
-   Forms: labels, help text, inline validation, disabled/loading states
    and error summaries.
-   Feedback: toast for brief outcomes; inline errors for recoverable
    form problems; confirmation dialogs for destructive actions.
-   Use skeletons only when loading duration warrants them; do not make
    skeletons look like finished data.

## Motion and animation

Use Motion for React for purposeful, short transitions: - hover/press
feedback on buttons and product cards; - subtle entrance or stagger on
selected content sections; - dialog/drawer transitions; - cart count
updates and add-to-cart feedback; - dashboard panel transitions where
they aid orientation. Respect `prefers-reduced-motion`. Avoid animating
every element, long blocking transitions, scroll hijacking, autoplay
motion, or animation that delays core tasks.

## 3D assets

3D can be distinctive but should be a selective enhancement: - Use a
small, optimized 3D visual in the home hero or a campaign section only
if it reinforces the brand. - Prefer a pre-rendered image/video or
lightweight interactive embed when equivalent. - Load 3D lazily, pause
when off-screen, provide a static fallback, and avoid loading it on
checkout, login or dashboard pages. - Compress models and textures;
track the impact on Largest Contentful Paint and total page weight. -
Never use a 3D icon for every navigation item. Use Lucide for ordinary
controls and reserve 3D visuals for storytelling.

## Accessibility and responsive design

-   Target WCAG 2.2 AA where practical.
-   All interactions must work with keyboard and screen reader.
-   Focus indicators must be visible.
-   Do not convey status through color alone.
-   Support narrow mobile screens without horizontal overflow.
-   Respect reduced-motion preferences and text zoom.
-   Maintain adequate contrast in both light and dark themes.

## Design review checklist

-   Is the hierarchy obvious within a few seconds?
-   Can a customer find and add a product quickly?
-   Are product photos consistent and attractive?
-   Are buttons, links, hover, focus and disabled states coherent?
-   Are loading, empty, error and success states designed?
-   Does the page work at 360px, tablet, laptop and wide desktop?
-   Are motion and 3D still useful when disabled or blocked?
