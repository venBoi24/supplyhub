import type { CatalogImage } from "./types";

const EDITORIAL_SIZE = { width: 1024, height: 768 } as const;

interface EditorialPhoto {
  readonly src: string;
  readonly alt: string;
}

/**
 * Department photography for browse tiles. Editorial frames lead the rotation;
 * approved product photos follow so seller uploads stay visible.
 * Keyed by category slug; unknown departments fall back to their own listings only.
 */
const EDITORIAL_PHOTOS: Record<string, readonly EditorialPhoto[]> = {
  "clothing-fashion": [
    {
      src: "/images/categories/clothing-fashion-1.jpg",
      alt: "Folded cotton t-shirt, indigo jeans, and leather sneakers",
    },
    {
      src: "/images/categories/clothing-fashion-2.jpg",
      alt: "Close view of folded denim and a cream knit sweater",
    },
  ],
  electronics: [
    {
      src: "/images/categories/electronics-1.jpg",
      alt: "Headphones, a phone, a smartwatch, and wireless earbuds",
    },
    {
      src: "/images/categories/electronics-2.jpg",
      alt: "Close view of headphones, earbuds, and a charging cable",
    },
  ],
  "home-living": [
    {
      src: "/images/categories/home-living-1.jpg",
      alt: "Table lamp, linen cushion, vase, and folded wool throw",
    },
    {
      src: "/images/categories/home-living-2.jpg",
      alt: "Close view of a wool throw and an amber candle",
    },
  ],
  "beauty-personal-care": [
    {
      src: "/images/categories/beauty-personal-care-1.jpg",
      alt: "Amber skincare bottles, a cream jar, and a gua sha stone",
    },
    {
      src: "/images/categories/beauty-personal-care-2.jpg",
      alt: "Close view of a cream jar, serum bottle, and linen towel",
    },
  ],
  "food-beverages": [
    {
      src: "/images/categories/food-beverages-1.jpg",
      alt: "Coffee beans, a jar of honey, sourdough, and oranges",
    },
    {
      src: "/images/categories/food-beverages-2.jpg",
      alt: "Close view of roasted coffee beans and amber honey",
    },
  ],
  "health-wellness": [
    {
      src: "/images/categories/health-wellness-1.jpg",
      alt: "Supplement bottle, rolled yoga mat, and steel water bottle",
    },
    {
      src: "/images/categories/health-wellness-2.jpg",
      alt: "Close view of a yoga mat, water bottle, and supplement bottle",
    },
  ],
  "books-stationery": [
    {
      src: "/images/categories/books-stationery-1.jpg",
      alt: "Stacked hardcover books, a notebook, pen, and glasses",
    },
    {
      src: "/images/categories/books-stationery-2.jpg",
      alt: "Close view of an open notebook and a fountain pen",
    },
  ],
  "toys-baby": [
    {
      src: "/images/categories/toys-baby-1.jpg",
      alt: "Wooden stacking rainbow, plush bear, and wooden blocks",
    },
    {
      src: "/images/categories/toys-baby-2.jpg",
      alt: "Close view of wooden toys and a plush bear",
    },
  ],
  "sports-outdoors": [
    {
      src: "/images/categories/sports-outdoors-1.jpg",
      alt: "Trail shoes, steel bottle, canvas backpack, and towel",
    },
    {
      src: "/images/categories/sports-outdoors-2.jpg",
      alt: "Close view of a canvas backpack, steel bottle, and towel",
    },
  ],
  "jewelry-accessories": [
    {
      src: "/images/categories/jewelry-accessories-1.jpg",
      alt: "Gold necklace, rings, leather watch, and sunglasses",
    },
    {
      src: "/images/categories/jewelry-accessories-2.jpg",
      alt: "Close view of a gold necklace and rings on a stone tray",
    },
  ],
  automotive: [
    {
      src: "/images/categories/automotive-1.jpg",
      alt: "Microfiber cloths, spray bottle, detailing brush, and tyre gauge",
    },
    {
      src: "/images/categories/automotive-2.jpg",
      alt: "Close view of car care brushes, microfiber cloths, and a tyre gauge",
    },
  ],
  "pet-supplies": [
    {
      src: "/images/categories/pet-supplies-1.jpg",
      alt: "Stoneware pet bowl, rope leash, ball, and plaid blanket",
    },
    {
      src: "/images/categories/pet-supplies-2.jpg",
      alt: "Close view of a pet bowl, rope leash, and rubber ball",
    },
  ],
  "art-crafts": [
    {
      src: "/images/categories/art-crafts-1.jpg",
      alt: "Paint tubes, brushes, sketchbook, and a wooden palette",
    },
    {
      src: "/images/categories/art-crafts-2.jpg",
      alt: "Close view of paint tubes, brushes, and a wooden palette",
    },
  ],
  "garden-tools": [
    {
      src: "/images/categories/garden-tools-1.jpg",
      alt: "Potted herb, brass trowel, gardening gloves, and watering can",
    },
    {
      src: "/images/categories/garden-tools-2.jpg",
      alt: "Close view of a brass trowel, gloves, and terracotta pot",
    },
  ],
};

export function editorialCategoryImages(slug: string): CatalogImage[] {
  const photos = EDITORIAL_PHOTOS[slug];

  if (!photos) {
    return [];
  }

  return photos.map((photo) => ({ ...photo, ...EDITORIAL_SIZE }));
}

/**
 * Puts a curated frame first and third, with the newest approved listing photo
 * between them. The tile opens on good department photography, the hover
 * rotation surfaces a real upload, then returns to the editorial set. When a
 * department has no editorial photos, its listings fill the rotation instead.
 */
export function composeCategoryImages(
  slug: string,
  listingImages: readonly CatalogImage[],
  limit = 3,
): CatalogImage[] {
  const [firstEditorial, ...remainder] = editorialCategoryImages(slug);

  if (!firstEditorial) {
    return listingImages.slice(0, limit);
  }

  const newestListing = listingImages.slice(0, 1);

  return [firstEditorial, ...newestListing, ...remainder].slice(0, limit);
}
