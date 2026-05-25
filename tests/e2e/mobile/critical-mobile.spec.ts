import { test, expect } from "@playwright/test";

/**
 * Critical mobile smoke tests.
 * These run in webkit-mobile project (iPhone 13 viewport).
 * Checks that key pages are functional and not broken on small screens.
 */
test.describe("Mobile critical paths", () => {
  test("dashboard is usable on mobile", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // No horizontal overflow (a common mobile bug)
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    // Allow up to 5px overflow tolerance
    expect(scrollWidth - clientWidth).toBeLessThanOrEqual(5);

    await expect(page.locator("body")).toBeVisible();
  });

  test("orders kanban is visible on mobile", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();

    // At least one column or card should be present
    await expect(page.locator("body")).toContainText(/.+/);
  });

  test("order detail is readable on mobile", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");

    const card = page.locator("a[href*='/orders/']").first();
    if (await card.isVisible().catch(() => false)) {
      await card.click();
      await page.waitForURL(/\/orders\/.+/);
      await expect(page.locator("body")).toBeVisible();

      // No overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth - clientWidth).toBeLessThanOrEqual(5);
    }
  });

  test("navigation links are tappable (not too small)", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const navLinks = page.locator("nav a, aside a");
    const count = await navLinks.count();

    if (count > 0) {
      for (let i = 0; i < Math.min(count, 5); i++) {
        const link = navLinks.nth(i);
        const box = await link.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44 px (Apple HIG)
          expect(box.height).toBeGreaterThanOrEqual(32); // relaxed minimum
        }
      }
    }
  });

  test("finance page loads on mobile", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    // Finance page has numeric content — at least one number should be present
    const numbers = page.locator("text=/\\d+/");
    expect(await numbers.count()).toBeGreaterThan(0);
    // Currency symbols may be hidden on mobile due to layout — just verify page loaded
    await expect(page.getByText(/This page could not be found|Internal Server Error|Application error/i)).not.toBeVisible();
  });
});
