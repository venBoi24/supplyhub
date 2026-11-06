/**
 * Currency is a configurable default, not settled business policy. docs/01-product-vision.md
 * still lists marketplace currency, tax, and commission as unresolved. The demo catalog trades in
 * Tanzanian shillings so it can settle through LynxPay, which is TZS-only.
 */
export const DEFAULT_CURRENCY = "TZS";

export const MAX_PRODUCT_IMAGES = 6;

export const DEMO_CATALOG_NOTICE =
  "Preview catalog — demo products, studios, and orders. LynxPay sandbox payments.";

export const HERO_IMAGE = {
  src: "/images/demo/hero.jpg",
  alt: "A cream stoneware vessel, two speckled cups, a folded linen throw, and a tan leather tote arranged on a limestone plinth in warm daylight.",
  width: 1024,
  height: 1280,
} as const;

/**
 * Product photos are displayed inside a fixed square frame. Storing a square intrinsic size
 * here keeps next/image deterministic without persisting dimensions for every upload.
 */
export const PRODUCT_IMAGE_WIDTH = 1024;
export const PRODUCT_IMAGE_HEIGHT = 1024;
