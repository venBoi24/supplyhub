import { mkdir, copyFile, stat } from "node:fs/promises";
import path from "node:path";

import { hash } from "@node-rs/argon2";
import { Client } from "pg";

const DEMO_PASSWORD = "SupplyHub!2026";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is not set. Run this with an .env file that defines it.");
  process.exit(1);
}

const uploadRoot = path.join(process.cwd(), ".local", "uploads");
const demoImageRoot = path.join(process.cwd(), "public", "images", "demo");

const admin = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "admin@supplyhub.test",
  name: "SupplyHub Admin",
};

const customer = {
  id: "00000000-0000-4000-8000-000000000002",
  email: "customer@supplyhub.test",
  name: "Mara Ellison",
};

const studios = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    ownerId: "20000000-0000-4000-8000-000000000001",
    email: "studio@atelier-nord.test",
    ownerName: "Ingrid Halvorsen",
    name: "Atelier Nord",
    slug: "atelier-nord",
    monogram: "AN",
    location: "Portland, Oregon",
    discipline: "Ceramics",
    description:
      "A two-wheel studio working in speckled stoneware and quiet glazes. Each piece is thrown in small batches, trimmed by hand, and fired twice.",
    story:
      "A two-wheel studio working in speckled stoneware and quiet glazes. Each piece is thrown in small batches, trimmed by hand, and fired twice. The ridges and thumb marks are left visible on purpose.",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    ownerId: "20000000-0000-4000-8000-000000000002",
    email: "studio@field-and-form.test",
    ownerName: "Owen Beck",
    name: "Field & Form",
    slug: "field-and-form",
    monogram: "FF",
    location: "Austin, Texas",
    discipline: "Leather goods",
    description:
      "Vegetable-tanned hides cut and stitched in small runs. Every piece darkens and softens with use.",
    story:
      "Field & Form cuts vegetable-tanned hides in a small workshop and finishes every edge by hand. The studio favors simple shapes, saddle stitching, and hardware that can be repaired rather than replaced.",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    ownerId: "20000000-0000-4000-8000-000000000003",
    email: "studio@loom-house.test",
    ownerName: "Naomi Reyes",
    name: "Loom House",
    slug: "loom-house",
    monogram: "LH",
    location: "Asheville, North Carolina",
    discipline: "Textiles",
    description:
      "Weaving in flax, cotton, and natural indigo. Cloth is washed and softened in small batches before it reaches a home.",
    story:
      "A weaving studio focused on flax, cotton, and natural indigo. Cloth is washed and softened in small batches, so the weave relaxes before it reaches a home. Slight irregularity is part of the finish.",
  },
];

const categories = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    slug: "ceramics",
    name: "Ceramics",
    headline: "Vessels for the daily ritual",
    description:
      "Wheel-thrown and hand-built pieces with visible evidence of the hand. Made to be used, not shelved.",
    sortOrder: 0,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    slug: "leather",
    name: "Leather goods",
    headline: "Carried, patinated, kept",
    description:
      "Vegetable-tanned hides cut and stitched in small runs. Every piece darkens and softens with use.",
    sortOrder: 1,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    slug: "textiles",
    name: "Textiles",
    headline: "Cloth with a longer memory",
    description:
      "Woven and naturally dyed in independent studios. Substantial enough for daily life, soft enough to live with.",
    sortOrder: 2,
  },
];

const products = [
  {
    id: "40000000-0000-4000-8000-000000000001",
    slug: "ridge-carafe",
    name: "Ridge Carafe",
    vendorSlug: "atelier-nord",
    categorySlug: "ceramics",
    price: "68.00",
    compareAtPrice: null,
    stock: 8,
    featured: true,
    publishedAt: "2026-10-24T12:00:00.000Z",
    summary: "A speckled stoneware carafe with a matte oat glaze and one deliberate ridge.",
    description:
      "Thrown on the wheel, trimmed, and dipped in a soft oat glaze that breaks over the ridge. The short pinched spout pours cleanly and the unglazed foot keeps the base grounded. Sized for water on a table or stems from the market.",
    makerNote:
      "The ridge is one pass of the thumb while the clay is still soft. The glaze catches it, so the line shows up again after firing.",
    materials: ["Speckled stoneware", "Food-safe matte glaze"],
    dimensions: "8.5 in tall × 4 in wide · 34 fl oz",
    care: "Hand wash and dry fully. Avoid sudden temperature changes.",
    image: {
      name: "ridge-carafe.jpg",
      alt: "A pale speckled stoneware carafe with a pinched spout photographed against a limestone wall.",
      id: "50000000-0000-4000-8000-000000000001",
    },
  },
  {
    id: "40000000-0000-4000-8000-000000000002",
    slug: "kiln-cups",
    name: "Kiln Cup Set",
    vendorSlug: "atelier-nord",
    categorySlug: "ceramics",
    price: "42.00",
    compareAtPrice: null,
    stock: 12,
    featured: false,
    publishedAt: "2026-10-12T12:00:00.000Z",
    summary: "Two handleless cups, glazed in sand and moss — a pair for slow mornings.",
    description:
      "Thrown as a pair and glazed in two earth tones. The walls are thick enough to hold heat and the rims are left slightly uneven. Use them for espresso, tea, or a small pour of something stronger.",
    makerNote:
      "The cups are thrown from the same clay batch, then glazed separately so the pair reads as related rather than identical.",
    materials: ["Speckled stoneware", "Sand and moss reactive glazes"],
    dimensions: "3 in tall × 3.25 in wide · 8 fl oz each",
    care: "Hand wash recommended. Dishwasher safe on a low-heat cycle.",
    image: {
      name: "kiln-cups.jpg",
      alt: "Two handleless stoneware cups, one sand-glazed and one moss-glazed, on a warm plaster surface.",
      id: "50000000-0000-4000-8000-000000000002",
    },
  },
  {
    id: "40000000-0000-4000-8000-000000000003",
    slug: "everyday-tote",
    name: "Everyday Tote",
    vendorSlug: "field-and-form",
    categorySlug: "leather",
    price: "185.00",
    compareAtPrice: null,
    stock: 3,
    featured: true,
    publishedAt: "2026-10-30T12:00:00.000Z",
    summary: "A structured vegetable-tanned leather tote with flat handles and an open top.",
    description:
      "Cut from a single hide and saddle-stitched at the stress points. The body is left unlined so the leather can age openly, and the flat handles sit comfortably over a shoulder. Holds a laptop, a book, and the rest of a working day.",
    makerNote:
      "We cut around the strongest part of the hide and let the natural creases stay. The bag will take on the shape of how you carry it.",
    materials: ["Vegetable-tanned leather", "Waxed cotton thread"],
    dimensions: "14.5 in wide × 12 in tall × 4.5 in deep · 10 in handle drop",
    care: "Store upright away from direct sun. Condition lightly once a year.",
    image: {
      name: "everyday-tote.jpg",
      alt: "A tan leather tote with two flat handles standing upright against a limestone backdrop.",
      id: "50000000-0000-4000-8000-000000000003",
    },
  },
  {
    id: "40000000-0000-4000-8000-000000000004",
    slug: "card-sleeve",
    name: "Card Sleeve",
    vendorSlug: "field-and-form",
    categorySlug: "leather",
    price: "58.00",
    compareAtPrice: null,
    stock: 0,
    featured: false,
    publishedAt: "2026-09-28T12:00:00.000Z",
    summary: "Four card pockets, one piece of cognac leather, and a full-length saddle stitch.",
    description:
      "A slim sleeve cut from a single piece of leather and folded rather than glued. Four pockets hold cards and a folded bill; the center slot takes a sixth card. Burnished edges and waxed thread keep it working for years.",
    makerNote:
      "Every edge is sanded, burnished, and waxed by hand before stitching. The sleeve starts stiff and ends up shaped to your pocket.",
    materials: ["Vegetable-tanned leather", "Waxed linen thread"],
    dimensions: "4.1 in wide × 2.9 in tall · 6 card capacity",
    care: "Wipe with a dry cloth. Avoid soaking; leather will darken with use.",
    image: {
      name: "card-sleeve.jpg",
      alt: "A cognac leather card sleeve with four card pockets and visible saddle stitching.",
      id: "50000000-0000-4000-8000-000000000004",
    },
  },
  {
    id: "40000000-0000-4000-8000-000000000005",
    slug: "linen-throw",
    name: "Linen Throw",
    vendorSlug: "loom-house",
    categorySlug: "textiles",
    price: "120.00",
    compareAtPrice: "145.00",
    stock: 6,
    featured: true,
    publishedAt: "2026-10-18T12:00:00.000Z",
    summary:
      "A stonewashed linen throw in undyed oatmeal, woven with a soft hand and a fringe edge.",
    description:
      "Woven from European flax, then washed and tumbled until the weave relaxes. The oatmeal color is undyed, so the natural variation in the yarn stays visible. Warm enough for a chair, light enough for a bed in summer.",
    makerNote:
      "The fringe is twisted by hand after the cloth comes off the loom. No two throws have exactly the same edge.",
    materials: ["100% European flax linen"],
    dimensions: "50 in × 70 in · hand-twisted fringe",
    care: "Machine wash cold on a gentle cycle. Line dry; do not bleach.",
    image: {
      name: "linen-throw.jpg",
      alt: "An oatmeal linen throw folded into a soft stack with a fringed edge on a plaster surface.",
      id: "50000000-0000-4000-8000-000000000005",
    },
  },
  {
    id: "40000000-0000-4000-8000-000000000006",
    slug: "market-apron",
    name: "Market Apron",
    vendorSlug: "loom-house",
    categorySlug: "textiles",
    price: "74.00",
    compareAtPrice: null,
    stock: 5,
    featured: false,
    publishedAt: "2026-10-08T12:00:00.000Z",
    summary: "Indigo-dyed cotton canvas with cross-back straps and a deep divided pocket.",
    description:
      "A working apron cut from midweight cotton canvas and dyed in small indigo baths. The cross-back straps keep weight off the neck, and the divided front pocket holds a notebook, pencils, and a phone. The dye will fade unevenly with washing and wear.",
    makerNote:
      "Each dip in the indigo bath shifts the blue. We leave the variation in rather than matching every apron to a single shade.",
    materials: ["Midweight cotton canvas", "Natural indigo dye"],
    dimensions: "One size · 32 in length · adjustable cross-back straps",
    care: "Machine wash cold with like colors. Expect indigo to soften over time.",
    image: {
      name: "market-apron.jpg",
      alt: "An indigo-dyed canvas apron with crossed back straps and a large front pocket hanging on a wooden peg.",
      id: "50000000-0000-4000-8000-000000000006",
    },
  },
];

function normalize(value) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function searchTextFor(product) {
  return normalize(
    [
      product.name,
      product.summary,
      product.description,
      product.makerNote,
      product.materials.join(" "),
      product.dimensions,
    ].join(" "),
  ).slice(0, 8000);
}

const studioBySlug = new Map(studios.map((studio) => [studio.slug, studio]));
const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

const client = new Client({ connectionString });
const passwordHash = await hash(DEMO_PASSWORD);

try {
  await client.connect();
  await client.query("BEGIN");

  const upsertUser = async (user, role) => {
    await client.query(
      `INSERT INTO users (
         id, email, name, password_hash, email_verified_at, role, status, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, now(), $5, 'ACTIVE', now(), now())
       ON CONFLICT (email) DO UPDATE
       SET name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           email_verified_at = now(),
           role = EXCLUDED.role,
           status = 'ACTIVE',
           updated_at = now()`,
      [user.id, user.email, user.name, passwordHash, role],
    );
  };

  await upsertUser(admin, "ADMIN");
  await upsertUser(customer, "CUSTOMER");

  for (const studio of studios) {
    await upsertUser({ id: studio.ownerId, email: studio.email, name: studio.ownerName }, "VENDOR");

    await client.query(
      `INSERT INTO vendors (
         id, owner_id, name, slug, description, monogram, location, discipline, story,
         status, reviewed_at, reviewed_by_id, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'APPROVED', now(), $10, now(), now())
       ON CONFLICT (slug) DO UPDATE
       SET owner_id = EXCLUDED.owner_id,
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           monogram = EXCLUDED.monogram,
           location = EXCLUDED.location,
           discipline = EXCLUDED.discipline,
           story = EXCLUDED.story,
           status = 'APPROVED',
           reviewed_at = now(),
           reviewed_by_id = EXCLUDED.reviewed_by_id,
           updated_at = now()`,
      [
        studio.id,
        studio.ownerId,
        studio.name,
        studio.slug,
        studio.description,
        studio.monogram,
        studio.location,
        studio.discipline,
        studio.story,
        admin.id,
      ],
    );
  }

  for (const category of categories) {
    await client.query(
      `INSERT INTO categories (
         id, name, slug, headline, description, status, sort_order, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, 'ACTIVE', $6, now(), now())
       ON CONFLICT (slug) DO UPDATE
       SET name = EXCLUDED.name,
           headline = EXCLUDED.headline,
           description = EXCLUDED.description,
           status = 'ACTIVE',
           sort_order = EXCLUDED.sort_order,
           updated_at = now()`,
      [
        category.id,
        category.name,
        category.slug,
        category.headline,
        category.description,
        category.sortOrder,
      ],
    );
  }

  for (const product of products) {
    const studio = studioBySlug.get(product.vendorSlug);
    const category = categoryBySlug.get(product.categorySlug);

    await client.query(
      `INSERT INTO products (
         id, vendor_id, category_id, slug, name, sku, summary, description, maker_note,
         materials, dimensions, care, search_text, price, compare_at_price, currency,
         stock, status, featured, reviewed_at, reviewed_by_id, submitted_at, published_at,
         created_at, updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, 'USD',
         $16, 'PUBLISHED', $17, $18, $19, $18, $18,
         now(), now()
       )
       ON CONFLICT (slug) DO UPDATE
       SET vendor_id = EXCLUDED.vendor_id,
           category_id = EXCLUDED.category_id,
           name = EXCLUDED.name,
           sku = EXCLUDED.sku,
           summary = EXCLUDED.summary,
           description = EXCLUDED.description,
           maker_note = EXCLUDED.maker_note,
           materials = EXCLUDED.materials,
           dimensions = EXCLUDED.dimensions,
           care = EXCLUDED.care,
           search_text = EXCLUDED.search_text,
           price = EXCLUDED.price,
           compare_at_price = EXCLUDED.compare_at_price,
           stock = EXCLUDED.stock,
           status = 'PUBLISHED',
           featured = EXCLUDED.featured,
           reviewed_at = EXCLUDED.reviewed_at,
           reviewed_by_id = EXCLUDED.reviewed_by_id,
           published_at = EXCLUDED.published_at,
           archived_at = NULL,
           updated_at = now()`,
      [
        product.id,
        studio.id,
        category.id,
        product.slug,
        product.name,
        `SH-${product.slug.replaceAll("-", "").toUpperCase().slice(0, 16)}`,
        product.summary,
        product.description,
        product.makerNote,
        product.materials,
        product.dimensions,
        product.care,
        searchTextFor(product),
        product.price,
        product.compareAtPrice,
        product.stock,
        product.featured,
        product.publishedAt,
        admin.id,
      ],
    );

    const source = path.join(demoImageRoot, product.image.name);
    const storageKey = `products/${product.id}/${product.image.id}.jpg`;
    const destination = path.join(uploadRoot, "products", product.id, `${product.image.id}.jpg`);

    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(source, destination);
    const file = await stat(destination);

    await client.query(
      `INSERT INTO product_images (
         id, product_id, storage_key, alt, content_type, byte_size, sort_order, status
       )
       VALUES ($1, $2, $3, $4, 'image/jpeg', $5, 0, 'APPROVED')
       ON CONFLICT (storage_key) DO UPDATE
       SET alt = EXCLUDED.alt,
           content_type = EXCLUDED.content_type,
           byte_size = EXCLUDED.byte_size,
           status = 'APPROVED'`,
      [product.image.id, product.id, storageKey, product.image.alt, file.size],
    );

    await client.query(
      `INSERT INTO inventory_movements (
         id, product_id, actor_id, delta, reason, resulting_stock, note
       )
       VALUES ($1, $2, $3, $4, 'INITIAL', $4, 'Initial stock recorded by the demo seed.')
       ON CONFLICT (id) DO UPDATE
       SET delta = EXCLUDED.delta,
           resulting_stock = EXCLUDED.resulting_stock`,
      [
        `60000000-0000-4000-8000-${product.id.slice(-12)}`,
        product.id,
        studio.ownerId,
        product.stock,
      ],
    );
  }

  await client.query("COMMIT");

  console.log("Seeded SupplyHub demo catalog.");
  console.log(`  Admin:    ${admin.email} / ${DEMO_PASSWORD}`);
  console.log(`  Customer: ${customer.email} / ${DEMO_PASSWORD}`);
  console.log(`  Studios:  ${studios.map((studio) => studio.email).join(", ")}`);
  console.log(`  Images:   ${products.length} copied to .local/uploads`);
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  console.error(error);
  process.exitCode = 1;
} finally {
  await client.end();
}
