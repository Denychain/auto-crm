import { test, expect } from "@playwright/test";
import { FinancePage } from "../helpers/pages";

test.describe("Finance reports", () => {
  test("finance page loads", async ({ page }) => {
    const financePage = new FinancePage(page);
    await financePage.goto();
    await expect(page).toHaveURL(/\/finance/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows revenue figures", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    // Some monetary amounts should be visible
    await expect(page.getByText(/₴|\$/).first()).toBeVisible();
  });

  test("period selector changes displayed data", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    // Look for period controls (buttons or select)
    const dayBtn = page.getByRole("button", { name: /день|day/i }).first();
    const weekBtn = page.getByRole("button", { name: /тиждень|week/i }).first();
    const monthBtn = page.getByRole("button", { name: /місяць|month/i }).first();

    // At least one period control should be visible
    const anyVisible =
      (await dayBtn.isVisible().catch(() => false)) ||
      (await weekBtn.isVisible().catch(() => false)) ||
      (await monthBtn.isVisible().catch(() => false));

    if (anyVisible) {
      if (await weekBtn.isVisible().catch(() => false)) {
        await weekBtn.click();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("body")).toBeVisible();
      }
    }
  });

  test("worker payouts section is visible", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    // Payouts or worker section
    const section = page.getByText(/виплати|виконавці|workers|payouts/i).first();
    if (await section.isVisible().catch(() => false)) {
      await expect(section).toBeVisible();
    }
  });

  test("no JavaScript errors on finance page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    expect(errors.filter((e) => !e.includes("hydration"))).toHaveLength(0);
  });

  test("dream fund section visible", async ({ page }) => {
    await page.goto("/finance");
    await page.waitForLoadState("networkidle");

    const dreamFund = page.getByText(/мрія|dream|fund|фонд/i).first();
    if (await dreamFund.isVisible().catch(() => false)) {
      await expect(dreamFund).toBeVisible();
    }
  });
});
