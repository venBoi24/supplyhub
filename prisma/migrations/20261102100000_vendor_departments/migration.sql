CREATE TABLE "vendor_departments" (
    "vendor_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_departments_pkey" PRIMARY KEY ("vendor_id", "category_id")
);

CREATE INDEX "vendor_departments_category_id_idx" ON "vendor_departments"("category_id");

ALTER TABLE "vendor_departments"
    ADD CONSTRAINT "vendor_departments_vendor_id_fkey"
    FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vendor_departments"
    ADD CONSTRAINT "vendor_departments_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "categories" ("id", "name", "slug", "headline", "description", "status", "sort_order", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), 'Clothing & Fashion', 'clothing-fashion', 'Clothing and fashion', 'Clothing, shoes, bags, and fashion accessories.', 'ACTIVE', 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Electronics', 'electronics', 'Electronics', 'Phones, computers, gadgets, and electronic accessories.', 'ACTIVE', 20, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Home & Living', 'home-living', 'Home and living', 'Furniture, home decor, kitchenware, and household essentials.', 'ACTIVE', 30, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Beauty & Personal Care', 'beauty-personal-care', 'Beauty and personal care', 'Skincare, cosmetics, haircare, and personal care products.', 'ACTIVE', 40, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Food & Beverages', 'food-beverages', 'Food and beverages', 'Packaged foods, snacks, drinks, and pantry goods.', 'ACTIVE', 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Health & Wellness', 'health-wellness', 'Health and wellness', 'Wellness products and health-related goods.', 'ACTIVE', 60, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Books & Stationery', 'books-stationery', 'Books and stationery', 'Books, office supplies, paper goods, and learning materials.', 'ACTIVE', 70, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Toys & Baby', 'toys-baby', 'Toys and baby', 'Toys, games, baby clothing, and nursery essentials.', 'ACTIVE', 80, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Sports & Outdoors', 'sports-outdoors', 'Sports and outdoors', 'Sports equipment, outdoor gear, and fitness accessories.', 'ACTIVE', 90, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Jewelry & Accessories', 'jewelry-accessories', 'Jewelry and accessories', 'Jewelry, watches, and personal accessories.', 'ACTIVE', 100, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Automotive', 'automotive', 'Automotive', 'Vehicle accessories, parts, and care products.', 'ACTIVE', 110, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Pet Supplies', 'pet-supplies', 'Pet supplies', 'Pet food, accessories, toys, and care products.', 'ACTIVE', 120, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Art & Crafts', 'art-crafts', 'Art and crafts', 'Original art, handmade crafts, and creative supplies.', 'ACTIVE', 130, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Garden & Tools', 'garden-tools', 'Garden and tools', 'Garden supplies, tools, and outdoor home products.', 'ACTIVE', 140, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
