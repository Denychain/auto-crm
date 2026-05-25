import { test, expect } from "@playwright/test";

test.describe("Backlog (Черга очікування)", () => {
  test("backlog page loads", async ({ page }) => {
    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/backlog/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows page heading 'Черга очікування'", async ({ page }) => {
    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Черга очікування").first()).toBeVisible();
  });

  test("shows orders in queue or empty state message", async ({ page }) => {
    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");

    // Either queue orders or "Черга порожня" empty state
    const hasOrders = await page.locator("a[href*='/orders/']").first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText("Черга порожня").first().isVisible().catch(() => false);
    expect(hasOrders || hasEmpty).toBe(true);
  });

  test("shows order count in header", async ({ page }) => {
    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");
    // "В черзі: N" is always shown
    await expect(page.getByText(/в черзі/i).first()).toBeVisible();
  });

  test("no JS errors on backlog page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/backlog");
    await page.waitForLoadState("networkidle");

    const critical = errors.filter(
      (e) => !e.toLowerCase().includes("hydration") && !e.toLowerCase().includes("warning")
    );
    expect(critical).toHaveLength(0);
  });
});
