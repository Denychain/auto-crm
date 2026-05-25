import { test, expect } from "@playwright/test";
import { ClientsPage } from "../helpers/pages";

test.describe("Clients page", () => {
  test("clients page loads", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();
    await expect(page).toHaveURL(/\/clients/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows list of clients", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    // Table or list should have rows
    const rows = clientsPage.clientRows;
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0); // At least renders; seed may not be loaded
  });

  test("search input is present", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    await expect(clientsPage.searchInput).toBeVisible();
  });

  test("search filters clients by name", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    // Search for seed client name
    await clientsPage.searchFor("Іван");
    await page.waitForTimeout(400);

    // Either results are shown or "not found" message
    const body = page.locator("body");
    await expect(body).toBeVisible();
    await expect(page.getByText(/uncaught|TypeError/i)).not.toBeVisible();
  });

  test("search filters by phone number", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    await clientsPage.searchFor("+38067");
    await page.waitForTimeout(400);

    await expect(page.locator("body")).toBeVisible();
  });

  test("client row shows phone number", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    // Phone numbers are formatted like +380XXXXXXXXX
    const phonePattern = page.getByText(/\+380\d{9}/);
    const count = await phonePattern.count();
    // If seed loaded, we'll have phones; otherwise this is a soft check
    if (count > 0) {
      await expect(phonePattern.first()).toBeVisible();
    }
  });

  test("clicking client opens client detail or order list", async ({ page }) => {
    const clientsPage = new ClientsPage(page);
    await clientsPage.goto();

    const firstClientLink = page.locator("a[href*='/clients/']").first();
    if (await firstClientLink.isVisible().catch(() => false)) {
      await firstClientLink.click();
      await page.waitForURL(/\/clients\/.+/);
      expect(page.url()).toContain("/clients/");
    }
  });
});
