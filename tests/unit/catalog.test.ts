import { describe, expect, it } from "vitest";

import { getAvailability, LOW_STOCK_THRESHOLD } from "@/features/catalog/availability";
import { applyStockAdjustment, MAX_UNIT_STOCK } from "@/features/catalog/inventory";
import { productImageAlt } from "@/features/catalog/image-alt";
import { buildSearchText, normalizeSearchText, searchTokens } from "@/features/catalog/search";
import { inventoryAdjustmentSchema, productInputSchema } from "@/features/catalog/validation";
import {
  MAX_IMAGE_BYTES,
  sniffImageType,
  validateImageUpload,
} from "@/server/storage/image-validation";
import { contentTypeForKey, isStorageKey, mediaUrlForKey } from "@/server/storage/keys";

const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const GIF_BYTES = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const AVIF_BYTES = new Uint8Array([
  0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66,
]);
const BMP_BYTES = new Uint8Array([0x42, 0x4d, 0x00, 0x00]);

describe("availability", () => {
  it("maps inventory to a status band", () => {
    expect(getAvailability(0)).toBe("sold-out");
    expect(getAvailability(-3)).toBe("sold-out");
    expect(getAvailability(1)).toBe("low-stock");
    expect(getAvailability(LOW_STOCK_THRESHOLD)).toBe("low-stock");
    expect(getAvailability(LOW_STOCK_THRESHOLD + 1)).toBe("in-stock");
  });
});

describe("search normalization", () => {
  it("normalizes case and diacritics", () => {
    expect(normalizeSearchText("Café Crème")).toBe("cafe creme");
  });

  it("builds deduplicated, bounded tokens", () => {
    expect(searchTokens("  Linen  LINEN indigo  ")).toEqual(["linen", "indigo"]);
    expect(searchTokens("a".repeat(80))).toEqual(["a".repeat(40)]);
    expect(searchTokens("one two three four five six seven eight nine")).toHaveLength(8);
  });

  it("indexes product copy including materials", () => {
    const text = buildSearchText({
      name: "Linen Throw",
      summary: "Stonewashed linen",
      description: "Woven from European flax.",
      materials: ["Flax", "Indigo"],
    });

    expect(text).toContain("linen throw");
    expect(text).toContain("flax");
    expect(text).toContain("indigo");
  });
});

describe("image upload validation", () => {
  it("sniffs allowed image signatures", () => {
    expect(sniffImageType(JPEG_BYTES)).toBe("jpg");
    expect(sniffImageType(PNG_BYTES)).toBe("png");
    expect(sniffImageType(WEBP_BYTES)).toBe("webp");
    expect(sniffImageType(GIF_BYTES)).toBe("gif");
    expect(sniffImageType(AVIF_BYTES)).toBe("avif");
    expect(sniffImageType(BMP_BYTES)).toBe("bmp");
    expect(sniffImageType(new Uint8Array([0x3c, 0x73, 0x76, 0x67]))).toBeNull();
  });

  it("accepts a matching file and returns its metadata", () => {
    expect(
      validateImageUpload({
        bytes: PNG_BYTES,
        declaredType: "image/png",
        declaredSize: PNG_BYTES.byteLength,
      }),
    ).toEqual({
      ok: true,
      image: { extension: "png", contentType: "image/png", byteSize: PNG_BYTES.byteLength },
    });
  });

  it("accepts the additional common image formats", () => {
    expect(
      validateImageUpload({
        bytes: GIF_BYTES,
        declaredType: "image/gif",
        declaredSize: GIF_BYTES.byteLength,
      }),
    ).toMatchObject({ ok: true, image: { extension: "gif", contentType: "image/gif" } });
    expect(
      validateImageUpload({
        bytes: AVIF_BYTES,
        declaredType: "image/avif",
        declaredSize: AVIF_BYTES.byteLength,
      }),
    ).toMatchObject({ ok: true, image: { extension: "avif", contentType: "image/avif" } });
    expect(
      validateImageUpload({
        bytes: BMP_BYTES,
        declaredType: "image/x-ms-bmp",
        declaredSize: BMP_BYTES.byteLength,
      }),
    ).toMatchObject({ ok: true, image: { extension: "bmp", contentType: "image/bmp" } });
  });

  it("rejects empty, oversized, truncated, and mismatched uploads", () => {
    expect(validateImageUpload({ bytes: new Uint8Array(), declaredType: "image/png" }).ok).toBe(
      false,
    );
    expect(
      validateImageUpload({
        bytes: new Uint8Array(MAX_IMAGE_BYTES + 1),
        declaredType: "image/png",
      }).ok,
    ).toBe(false);
    expect(
      validateImageUpload({
        bytes: PNG_BYTES,
        declaredType: "image/png",
        declaredSize: PNG_BYTES.byteLength + 4,
      }).ok,
    ).toBe(false);
    expect(validateImageUpload({ bytes: PNG_BYTES, declaredType: "image/jpeg" }).ok).toBe(false);
    expect(validateImageUpload({ bytes: JPEG_BYTES, declaredType: "image/svg+xml" }).ok).toBe(
      false,
    );
  });
});

describe("product image alt text", () => {
  it("derives accessible alt text from the product name", () => {
    expect(productImageAlt("  Ridge   Carafe ")).toBe("Photo of Ridge Carafe");
    expect(productImageAlt("")).toBe("Product photo");
    expect(productImageAlt("a".repeat(200))).toHaveLength(160);
  });
});

describe("storage keys", () => {
  const key =
    "products/40000000-0000-4000-8000-000000000001/50000000-0000-4000-8000-000000000002.jpg";

  it("accepts generated product keys only", () => {
    expect(isStorageKey(key)).toBe(true);
    expect(isStorageKey("products/../secrets.jpg")).toBe(false);
    expect(isStorageKey("public/images/demo/ridge-carafe.jpg")).toBe(false);
    expect(isStorageKey(key.replace(".jpg", ".svg"))).toBe(false);
  });

  it("derives the media URL and content type from the extension", () => {
    expect(mediaUrlForKey(key)).toBe(`/media/${key}`);
    expect(contentTypeForKey(key)).toBe("image/jpeg");
    expect(contentTypeForKey(key.replace(".jpg", ".gif"))).toBe("image/gif");
    expect(contentTypeForKey(key.replace(".jpg", ".avif"))).toBe("image/avif");
    expect(contentTypeForKey("products/a/b.svg")).toBeNull();
  });
});

describe("inventory adjustments", () => {
  it("adds and sets stock with a signed delta", () => {
    expect(applyStockAdjustment(4, { mode: "add", quantity: 3 })).toEqual({
      ok: true,
      previousStock: 4,
      nextStock: 7,
      delta: 3,
    });
    expect(applyStockAdjustment(4, { mode: "set", quantity: 0 })).toEqual({
      ok: true,
      previousStock: 4,
      nextStock: 0,
      delta: -4,
    });
  });

  it("rejects invalid quantities and unsupported stock levels", () => {
    expect(applyStockAdjustment(4, { mode: "add", quantity: 0 }).ok).toBe(false);
    expect(applyStockAdjustment(4, { mode: "add", quantity: -1 }).ok).toBe(false);
    expect(applyStockAdjustment(4, { mode: "add", quantity: 1.5 }).ok).toBe(false);
    expect(applyStockAdjustment(4, { mode: "set", quantity: 4 }).ok).toBe(false);
    expect(applyStockAdjustment(4, { mode: "set", quantity: MAX_UNIT_STOCK + 1 }).ok).toBe(false);
    expect(applyStockAdjustment(-1, { mode: "set", quantity: 1 }).ok).toBe(false);
    expect(applyStockAdjustment(4.2, { mode: "set", quantity: 1 }).ok).toBe(false);
  });
});

describe("catalog input validation", () => {
  const validProduct = {
    name: "Ridge Carafe",
    slug: "Ridge-Carafe",
    categoryId: "40000000-0000-4000-8000-000000000010",
    sku: "an-carafe-1",
    priceCents: "68.00",
    compareAtPriceCents: "84.00",
    summary: "A speckled stoneware carafe with a matte glaze.",
    description: "Thrown on the wheel and trimmed by hand before a slow glaze firing.",
    makerNote: "",
    materials: "Stoneware, Oat glaze",
    dimensions: "8.5 in tall",
    care: "",
    initialStock: "",
  };

  it("normalizes handles, SKUs, prices, materials, and empty stock", () => {
    const parsed = productInputSchema.parse(validProduct);

    expect(parsed.slug).toBe("ridge-carafe");
    expect(parsed.sku).toBe("AN-CARAFE-1");
    expect(parsed.priceCents).toBe(6800);
    expect(parsed.compareAtPriceCents).toBe(8400);
    expect(parsed.materials).toEqual(["Stoneware", "Oat glaze"]);
    expect(parsed.initialStock).toBe(0);
  });

  it("rejects a comparison price at or below the sale price", () => {
    const result = productInputSchema.safeParse({
      ...validProduct,
      compareAtPriceCents: "60.00",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path[0] === "compareAtPriceCents")).toBe(
        true,
      );
    }
  });

  it("rejects malformed handles and SKUs", () => {
    expect(productInputSchema.safeParse({ ...validProduct, slug: "../admin" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...validProduct, sku: "bad sku!" }).success).toBe(false);
  });

  it("requires a reason and a quantity when adding stock", () => {
    const base = {
      productId: "40000000-0000-4000-8000-000000000001",
      mode: "add",
      quantity: "0",
      reason: "RESTOCK",
      note: "",
    };

    expect(inventoryAdjustmentSchema.safeParse(base).success).toBe(false);
    expect(inventoryAdjustmentSchema.safeParse({ ...base, quantity: "2" }).success).toBe(true);
    expect(
      inventoryAdjustmentSchema.safeParse({ ...base, quantity: "2", reason: "SALE" }).success,
    ).toBe(false);
  });
});
