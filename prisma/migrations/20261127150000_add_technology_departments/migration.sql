-- Re-space the department order so technology sub-departments can sit directly
-- after Electronics without colliding with the existing ten-step gaps.
UPDATE "categories"
SET "sort_order" = CASE "slug"
        WHEN 'clothing-fashion' THEN 100
        WHEN 'electronics' THEN 200
        WHEN 'home-living' THEN 300
        WHEN 'beauty-personal-care' THEN 400
        WHEN 'food-beverages' THEN 500
        WHEN 'health-wellness' THEN 600
        WHEN 'books-stationery' THEN 700
        WHEN 'toys-baby' THEN 800
        WHEN 'sports-outdoors' THEN 900
        WHEN 'jewelry-accessories' THEN 1000
        WHEN 'automotive' THEN 1100
        WHEN 'pet-supplies' THEN 1200
        WHEN 'art-crafts' THEN 1300
        WHEN 'garden-tools' THEN 1400
        ELSE "sort_order"
    END,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" IN (
    'clothing-fashion',
    'electronics',
    'home-living',
    'beauty-personal-care',
    'food-beverages',
    'health-wellness',
    'books-stationery',
    'toys-baby',
    'sports-outdoors',
    'jewelry-accessories',
    'automotive',
    'pet-supplies',
    'art-crafts',
    'garden-tools'
);

-- Technology departments sellers can choose from. They sit under Electronics
-- while remaining selectable anywhere a department list is shown.
INSERT INTO "categories" ("id", "parent_id", "name", "slug", "headline", "description", "status", "sort_order", "created_at", "updated_at")
VALUES
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Smartphones & Tablets', 'smartphones-tablets', 'Phones, tablets, and e-readers', 'Smartphones, tablets, e-readers, and mobile devices, new or refurbished.', 'ACTIVE', 210, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Laptops & Computers', 'laptops-computers', 'Laptops, desktops, and workstations', 'Laptops, desktops, all-in-ones, and workstations for work, study, and play.', 'ACTIVE', 211, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'PC Parts & Components', 'pc-parts-components', 'GPUs, CPUs, RAM, and storage', 'Graphics cards, processors, memory, motherboards, SSDs, power supplies, cooling, and PC cases.', 'ACTIVE', 212, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Monitors & Displays', 'monitors-displays', 'Screens for every desk', 'Monitors, portable displays, and display accessories.', 'ACTIVE', 213, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'TVs & Home Entertainment', 'tvs-home-entertainment', 'Televisions and projectors', 'Televisions, projectors, streaming devices, and home cinema equipment.', 'ACTIVE', 214, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Audio & Headphones', 'audio-headphones', 'Headphones, speakers, and sound', 'Headphones, earbuds, speakers, soundbars, microphones, and audio equipment.', 'ACTIVE', 215, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Cameras & Drones', 'cameras-drones', 'Cameras, lenses, and aerial gear', 'Cameras, lenses, action cameras, drones, gimbals, and photography accessories.', 'ACTIVE', 216, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Gaming & Consoles', 'gaming-consoles', 'Consoles, controllers, and VR', 'Game consoles, controllers, VR headsets, and gaming accessories.', 'ACTIVE', 217, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Networking', 'networking', 'Routers, switches, and Wi-Fi', 'Routers, modems, switches, access points, and networking accessories.', 'ACTIVE', 218, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Smart Home & Wearables', 'smart-home-wearables', 'Wearables and home automation', 'Smartwatches, fitness trackers, smart lighting, plugs, sensors, and home automation.', 'ACTIVE', 219, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Printers & Office Tech', 'printers-office-tech', 'Printing and office equipment', 'Printers, scanners, shredders, label makers, and office technology.', 'ACTIVE', 220, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), (SELECT "id" FROM "categories" WHERE "slug" = 'electronics'), 'Tech Accessories', 'tech-accessories', 'Chargers, cables, cases, and more', 'Chargers, cables, power banks, cases, keyboards, mice, storage drives, and other tech accessories.', 'ACTIVE', 221, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
