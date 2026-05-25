import { test, expect } from "@playwright/test";

test.describe("Dashboard", () => {
  test("dashboard loads at /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows stat cards or numeric summaries", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Dashboard renders order counts, amounts — at least one digit should exist
    const numbers = page.locator("text=/\\d+/");
    expect(await numbers.count()).toBeGreaterThan(0);
  });

  test("navigation sidebar links are visible", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // SideNav has at least Замовлення link
    await expect(page.getByRole("link", { name: /замовлення/i }).first()).toBeVisible();
  });

  test("shows orders-related content", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Any reference to orders or статус
    await expect(page.getByText(/замовлення|в роботі|черга|готово/i).first()).toBeVisible();
  });

  test("no critical JS errors on dashboard", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Ignore hydration warnings (DnD aria-describedby mismatch is a known Next.js/dnd-kit issue)
    const critical = errors.filter(
      (e) => !e.toLowerCase().includes("hydration") &&
             !e.toLowerCase().includes("warning") &&
             !e.toLowerCase().includes("aria-describedby")
    );
    expect(critical).toHaveLength(0);
  });

  test("root / serves the landing or redirects to a CRM page", async ({ page }) => {
    // NOTE: / is the public landing page (nice.car.if), NOT a redirect to /dashboard
    // This test just verifies the site is up
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    // No Next.js error pages (their heading is very specific)
    await expect(page.getByText(/This page could not be found|Internal Server Error|Application error/i)).not.toBeVisible();
  });
});
