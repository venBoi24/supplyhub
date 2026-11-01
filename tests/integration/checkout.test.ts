// @vitest-environment node

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { decimalToCents } from "@/features/catalog/money";
import { CheckoutError, placeOrder, releaseExpiredReservations } from "@/features/checkout/service";
import type { CheckoutAddressInput } from "@/features/checkout/validation";

const connectionString = process.env.TEST_DATABASE_URL;

const address: CheckoutAddressInput = {
  recipientName: "Mara Ellison",
  contactEmail: "mara@example.com",
  contactPhone: undefined,
  addressLine1: "14 Alder Lane",
  addressLine2: undefined,
  city: "Portland",
  region: "Oregon",
  postalCode: "97205",
  countryCode: "US",
};

function blockAuditWrites(tx: Prisma.TransactionClient): Prisma.TransactionClient {
  return new Proxy(tx, {
    get(target, property, receiver) {
      if (property === "auditLog") {
        return {
          create: async () => {
            throw new Error("simulated audit failure");
          },
        };
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

describe.runIf(Boolean(connectionString))("checkout against PostgreSQL", () => {
  const database = new PrismaClient({
    adapter: new PrismaPg({ connectionString, max: 5 }),
    log: ["error"],
  });

  const suffix = randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const vendorIds: string[] = [];
  const productIds: string[] = [];
  const cartIds: string[] = [];
  let categoryId = "";
  let checkoutCustomer = "";
  let carafe = "";
  let linenThrow = "";
  let limited = "";

  async function createCart(lines: { productId: string; quantity: number }[]) {
    const cart = await database.cart.create({
      data: { userId: checkoutCustomer },
      select: { id: true },
    });
    cartIds.push(cart.id);
    await database.cartItem.createMany({
      data: lines.map((line) => ({ cartId: cart.id, ...line })),
    });
    return cart.id;
  }

  async function createUser(role: "CUSTOMER" | "VENDOR") {
    const user = await database.user.create({
      data: {
        email: `checkout-${role.toLowerCase()}-${randomUUID()}@example.com`,
        name: `Checkout ${role}`,
        role,
      },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  beforeAll(async () => {
    const vendorOneOwner = await createUser("VENDOR");
    const vendorTwoOwner = await createUser("VENDOR");

    const vendorOne = await database.vendor.create({
      data: {
        ownerId: vendorOneOwner,
        name: "Test Atelier",
        slug: `test-atelier-${suffix}`,
        status: "APPROVED",
      },
      select: { id: true },
    });
    const vendorTwo = await database.vendor.create({
      data: {
        ownerId: vendorTwoOwner,
        name: "Test Loom",
        slug: `test-loom-${suffix}`,
        status: "APPROVED",
      },
      select: { id: true },
    });
    vendorIds.push(vendorOne.id, vendorTwo.id);

    const category = await database.category.create({
      data: { name: "Checkout objects", slug: `checkout-${suffix}` },
      select: { id: true },
    });
    categoryId = category.id;

    const product = (vendorId: string, name: string, price: string, stock: number) =>
      database.product.create({
        data: {
          vendorId,
          categoryId,
          slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${suffix}`,
          name,
          sku: `${name.toUpperCase().replace(/\s+/g, "-")}-${suffix}`,
          summary: "A test object.",
          description: "Created for the checkout integration gate.",
          price,
          currency: "USD",
          stock,
          status: "PUBLISHED",
        },
        select: { id: true, sku: true },
      });

    carafe = (await product(vendorOne.id, "Test Carafe", "68.00", 5)).id;
    linenThrow = (await product(vendorTwo.id, "Test Throw", "120.00", 8)).id;
    limited = (await product(vendorOne.id, "Test Limited", "42.00", 1)).id;
    productIds.push(carafe, linenThrow, limited);
  });

  beforeEach(async () => {
    checkoutCustomer = await createUser("CUSTOMER");
    await database.product.update({ where: { id: carafe }, data: { stock: 5, price: "68.00" } });
    await database.product.update({
      where: { id: linenThrow },
      data: { stock: 8, price: "120.00" },
    });
    await database.product.update({ where: { id: limited }, data: { stock: 1, price: "42.00" } });
  });

  afterAll(async () => {
    const orders = await database.order.findMany({
      where: { customerId: { in: userIds } },
      select: { id: true },
    });
    const orderIds = orders.map((order) => order.id);

    await database.auditLog.deleteMany({
      where: { OR: [{ targetId: { in: orderIds } }, { actorId: { in: userIds } }] },
    });
    await database.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await database.vendorOrder.deleteMany({ where: { orderId: { in: orderIds } } });
    await database.order.deleteMany({ where: { id: { in: orderIds } } });
    await database.inventoryMovement.deleteMany({ where: { productId: { in: productIds } } });
    await database.cart.deleteMany({ where: { id: { in: cartIds } } });
    await database.product.deleteMany({ where: { id: { in: productIds } } });
    await database.category.deleteMany({ where: { id: categoryId } });
    await database.vendor.deleteMany({ where: { id: { in: vendorIds } } });
    await database.user.deleteMany({ where: { id: { in: userIds } } });
    await database.$disconnect();
  });

  it("splits a mixed-vendor cart into vendor orders with authoritative snapshots", async () => {
    const cartId = await createCart([
      { productId: carafe, quantity: 1 },
      { productId: linenThrow, quantity: 2 },
    ]);

    const placed = await placeOrder(database, {
      customerId: checkoutCustomer,
      cartId,
      address,
      reservationMinutes: 15,
    });

    expect(placed.vendorCount).toBe(2);
    expect(placed.itemCount).toBe(3);
    expect(placed.totalCents).toBe(6800 + 24000);

    const order = await database.order.findUniqueOrThrow({
      where: { id: placed.id },
      include: { vendorOrders: { include: { items: true } } },
    });

    expect(order.status).toBe("AWAITING_PAYMENT");
    expect(decimalToCents(order.subtotal)).toBe(30800);
    expect(decimalToCents(order.total)).toBe(30800);
    expect(order.reservationExpiresAt?.getTime()).toBe(placed.reservationExpiresAt.getTime());
    expect(order.vendorOrders).toHaveLength(2);

    const items = order.vendorOrders.flatMap((vendorOrder) => vendorOrder.items);
    const carafeItem = items.find((item) => item.productId === carafe);
    const throwItem = items.find((item) => item.productId === linenThrow);

    expect(decimalToCents(carafeItem?.unitPrice ?? 0)).toBe(6800);
    expect(decimalToCents(throwItem?.unitPrice ?? 0)).toBe(12000);
    expect(decimalToCents(throwItem?.lineTotal ?? 0)).toBe(24000);

    const stocks = await database.product.findMany({
      where: { id: { in: [carafe, linenThrow] } },
      select: { id: true, stock: true },
    });

    expect(stocks.find((row) => row.id === carafe)?.stock).toBe(4);
    expect(stocks.find((row) => row.id === linenThrow)?.stock).toBe(6);
    expect(await database.cartItem.count({ where: { cartId } })).toBe(0);
    expect(
      await database.inventoryMovement.count({
        where: { productId: { in: [carafe, linenThrow] }, reason: "SALE" },
      }),
    ).toBeGreaterThanOrEqual(2);
    expect(
      await database.auditLog.count({ where: { targetId: placed.id, action: "ORDER_PLACED" } }),
    ).toBe(1);
  });

  it("ignores client-supplied prices and snapshots the current database price", async () => {
    const cartId = await createCart([{ productId: carafe, quantity: 1 }]);
    await database.product.update({ where: { id: carafe }, data: { price: "71.00" } });

    // Extra fields simulate a tampered payload; the service must ignore them.
    const tampered = {
      customerId: checkoutCustomer,
      cartId,
      address,
      reservationMinutes: 15,
      priceCents: 1,
      unitPriceCents: 1,
      totalCents: 1,
    } as unknown as Parameters<typeof placeOrder>[1];
    const placed = await placeOrder(database, tampered);
    const order = await database.order.findUniqueOrThrow({
      where: { id: placed.id },
      include: { items: true },
    });

    expect(placed.totalCents).toBe(7100);
    expect(decimalToCents(order.total)).toBe(7100);
    expect(decimalToCents(order.items[0]?.unitPrice ?? 0)).toBe(7100);
  });

  it("rejects unavailable stock without creating an order or changing stock", async () => {
    const cartId = await createCart([{ productId: carafe, quantity: 4 }]);
    await database.product.update({ where: { id: carafe }, data: { stock: 2 } });

    const before = await database.order.count({ where: { customerId: checkoutCustomer } });

    await expect(
      placeOrder(database, {
        customerId: checkoutCustomer,
        cartId,
        address,
        reservationMinutes: 15,
      }),
    ).rejects.toMatchObject({ code: "unavailable-items" });

    expect(await database.order.count({ where: { customerId: checkoutCustomer } })).toBe(before);
    expect((await database.product.findUniqueOrThrow({ where: { id: carafe } })).stock).toBe(2);
    expect(await database.cartItem.count({ where: { cartId } })).toBe(1);
  });

  it("lets only one of two concurrent checkouts consume the last unit", async () => {
    const cartId = await createCart([{ productId: limited, quantity: 1 }]);

    const results = await Promise.allSettled([
      placeOrder(database, {
        customerId: checkoutCustomer,
        cartId,
        address,
        reservationMinutes: 15,
      }),
      placeOrder(database, {
        customerId: checkoutCustomer,
        cartId,
        address,
        reservationMinutes: 15,
      }),
    ]);

    const fulfilled = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(CheckoutError);
    expect((await database.product.findUniqueOrThrow({ where: { id: limited } })).stock).toBe(0);
    expect(await database.orderItem.count({ where: { productId: limited } })).toBe(1);
  });

  it("rolls back the whole transaction when a later step fails", async () => {
    const cartId = await createCart([{ productId: carafe, quantity: 2 }]);
    const before = await database.order.count({ where: { customerId: checkoutCustomer } });

    const failingClient = new Proxy(database, {
      get(target, property, receiver) {
        if (property === "$transaction") {
          return (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
            target.$transaction((tx) => callback(blockAuditWrites(tx)));
        }

        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    }) as PrismaClient;

    await expect(
      placeOrder(failingClient, {
        customerId: checkoutCustomer,
        cartId,
        address,
        reservationMinutes: 15,
      }),
    ).rejects.toThrow("simulated audit failure");

    expect(await database.order.count({ where: { customerId: checkoutCustomer } })).toBe(before);
    expect((await database.product.findUniqueOrThrow({ where: { id: carafe } })).stock).toBe(5);
    expect(await database.cartItem.count({ where: { cartId } })).toBe(1);
  });

  it("expires and releases an abandoned reservation exactly once", async () => {
    const cartId = await createCart([{ productId: carafe, quantity: 2 }]);

    const placed = await placeOrder(database, {
      customerId: checkoutCustomer,
      cartId,
      address,
      reservationMinutes: 15,
    });

    expect((await database.product.findUniqueOrThrow({ where: { id: carafe } })).stock).toBe(3);

    await database.order.update({
      where: { id: placed.id },
      data: { reservationExpiresAt: new Date(Date.now() - 60_000) },
    });

    const released = await Promise.all([
      releaseExpiredReservations(database, new Date()),
      releaseExpiredReservations(database, new Date()),
    ]);

    // The sweep is global, so other expired orders in a shared database may be released too.
    // Exactly-once for this reservation is asserted against its own stock and movement below.
    expect(released[0] + released[1]).toBeGreaterThanOrEqual(1);

    const order = await database.order.findUniqueOrThrow({
      where: { id: placed.id },
      include: { vendorOrders: true },
    });

    expect(order.status).toBe("EXPIRED");
    expect(order.vendorOrders.every((vendorOrder) => vendorOrder.status === "EXPIRED")).toBe(true);
    expect((await database.product.findUniqueOrThrow({ where: { id: carafe } })).stock).toBe(5);
    expect(
      await database.inventoryMovement.count({
        where: { productId: carafe, reason: "RELEASE" },
      }),
    ).toBe(1);

    await releaseExpiredReservations(database, new Date());
    expect((await database.product.findUniqueOrThrow({ where: { id: carafe } })).stock).toBe(5);
    expect(
      await database.inventoryMovement.count({
        where: { productId: carafe, reason: "RELEASE" },
      }),
    ).toBe(1);
  });
});
