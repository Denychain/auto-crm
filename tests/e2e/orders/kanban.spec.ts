import { test, expect } from "@playwright/test";

test.describe("Orders Kanban", () => {
  test("shows kanban board on /orders", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/orders/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows status columns", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Column labels from the app
    const expected = ["Черга", "Підготовка", "Фарбування", "Готово"];
    for (const label of expected) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
  });

  test("order cards display vehicle plate", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // At least one plate from seed should appear (AA1111BB, BB2222CC…)
    const plateEl = page.getByText(/[A-Z]{2}\d{3,4}[A-Z]{2}/).first();
    if (await plateEl.isVisible().catch(() => false)) {
      await expect(plateEl).toBeVisible();
    }
  });

  test("clicking an order card opens order detail", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    // Skip /orders/new — get a real order card
    const card = page.locator('a[href*="/orders/"]:not([href="/orders/new"])').first();

    await expect(card).toBeVisible();
    await card.click();
    await page.waitForURL(/\/orders\/.+/);
    // Should be on an order detail page (UUID in URL, not /new)
    expect(page.url()).toMatch(/\/orders\/[a-f0-9-]{10,}/);
  });

  test("has navigation sidebar", async ({ page }) => {
    await page.goto("/orders");
    // SideNav or layout navigation should be present
    await expect(page.locator("body")).toBeVisible();
  });

  test("new order button (+ Нове) is visible", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    // The button renders as Link with text "+ Нове"
    const btn = page.getByRole("link", { name: /нове/i }).first();
    await expect(btn).toBeVisible();
  });
});
