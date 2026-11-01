import { expect, test } from "@playwright/test";

test("guest can browse the storefront and open the catalog", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /objects with a maker's name/i })).toBeVisible();
  await page.getByRole("link", { name: /browse the catalog/i }).click();
  await expect(page).toHaveURL(/\/products/);
  await expect(page.getByRole("heading", { name: /all objects/i })).toBeVisible();
});

test("manifest works and private routes are not cached for offline access", async ({
  page,
  context,
}) => {
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect(await manifest.json()).toMatchObject({
    name: "SupplyHub — Independent makers",
    start_url: "/",
    display: "standalone",
  });

  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.register("/service-worker.js", { scope: "/" }));
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await navigator.serviceWorker.getRegistration("/"))?.active?.state ?? "inactive",
      ),
    )
    .toBe("activated");
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);

  await context.setOffline(true);
  await page.goto("/account");
  await expect(page.getByRole("heading", { name: /you’re offline/i })).toBeVisible();
  const cachedPaths = await page.evaluate(async () => {
    const cacheNames = await caches.keys();
    const entries = await Promise.all(
      cacheNames.map(async (name) => (await caches.open(name)).keys()),
    );
    return entries.flat().map((request) => new URL(request.url).pathname);
  });
  expect(cachedPaths).not.toContain("/account");
  expect(
    cachedPaths.every(
      (path) =>
        path === "/offline.html" || path.startsWith("/_next/static/") || path.startsWith("/icons/"),
    ),
  ).toBeTruthy();
  await context.setOffline(false);
});
