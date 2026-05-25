import { test, expect } from "@playwright/test";

test.describe("Team / Workers settings", () => {
  test("settings/team page loads", async ({ page }) => {
    await page.goto("/settings/team");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/uncaught|TypeError|500/i)).not.toBeVisible();
  });

  test("shows worker list or empty state", async ({ page }) => {
    await page.goto("/settings/team");
    await page.waitForLoadState("networkidle");

    // Either shows workers (from seed) or empty state
    const hasWorkers = await page.getByText(/Тато|Ілля|Вася/).first().isVisible().catch(() => false);
    const hasEmpty = await page.getByText(/немає|empty|додайте/i).first().isVisible().catch(() => false);

    expect(hasWorkers || hasEmpty).toBe(true);
  });

  test("add worker button is visible", async ({ page }) => {
    await page.goto("/settings/team");
    await page.waitForLoadState("networkidle");

    const btn = page.getByRole("button", { name: /додати|add|новий|new/i }).first();
    await expect(btn).toBeVisible();
  });

  test("settings/share-templates page loads", async ({ page }) => {
    await page.goto("/settings/share-templates");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.getByText(/uncaught|TypeError|500/i)).not.toBeVisible();
  });

  test("shows share templates or empty state", async ({ page }) => {
    await page.goto("/settings/share-templates");
    await page.waitForLoadState("networkidle");

    const hasTemplates =
      await page.getByText(/стандарт|соло|standard|solo/i).first().isVisible().catch(() => false);
    const hasEmpty =
      await page.getByText(/немає|empty|додайте/i).first().isVisible().catch(() => false);

    expect(hasTemplates || hasEmpty).toBe(true);
  });

  test("no JS errors on team page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/settings/team");
    await page.waitForLoadState("networkidle");

    const critical = errors.filter((e) => !e.toLowerCase().includes("hydration"));
    expect(critical).toHaveLength(0);
  });
});
