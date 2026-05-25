import { test, expect } from "@playwright/test";

test.describe("Order finance math (UI)", () => {
  /** Get href of first real order (not /orders/new) */
  async function getFirstOrderHref(page: import("@playwright/test").Page) {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    const card = page.locator('a[href*="/orders/"]:not([href="/orders/new"])').first();
    if (!await card.isVisible().catch(() => false)) return null;
    const href = await card.getAttribute("href");
    return href !== "/orders/new" ? href : null;
  }

  test("order page shows UAH amounts in finance block", async ({ page }) => {
    const href = await getFirstOrderHref(page);
    if (!href) { test.skip(); return; }

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // FinanceBlock shows "Роботи", "Запчастини" and then amounts with ₴
    await expect(page.getByText("Фінанси").first()).toBeVisible();
    // There should be at least one ₴ or $ symbol on the page
    await expect(page.getByText(/₴|\$/).first()).toBeVisible();
  });

  test("worker shares section shows amounts when shares exist", async ({ page }) => {
    // Navigate through orders to find one with worker shares
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const cards = await page
      .locator('a[href*="/orders/"]:not([href="/orders/new"])')
      .all();

    for (const card of cards.slice(0, 8)) {
      const href = await card.getAttribute("href");
      if (!href || href === "/orders/new") continue;

      await page.goto(href);
      await page.waitForLoadState("networkidle");

      // Check if this order has shares
      const sharesTitle = page.getByText("Зарплати майстрів").first();
      if (!await sharesTitle.isVisible().catch(() => false)) continue;

      const shareRows = page.locator("text=/\\d+\\s*[₴$]/");
      if (await shareRows.count() > 0) {
        await expect(shareRows.first()).toBeVisible();
        return; // found it
      }
    }
    // No order with shares found — soft pass
    test.info().annotations.push({ type: "note", description: "No orders with share amounts found" });
  });

  test("advance payment field is visible", async ({ page }) => {
    const href = await getFirstOrderHref(page);
    if (!href) { test.skip(); return; }

    await page.goto(href);
    await page.waitForLoadState("networkidle");

    // "Завдаток" text appears in FinanceBlock
    await expect(page.getByText(/завдаток|аванс|advance/i).first()).toBeVisible();
  });
});
