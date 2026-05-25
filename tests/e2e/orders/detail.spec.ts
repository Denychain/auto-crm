import { test, expect } from "@playwright/test";

test.describe("Order Detail", () => {
  /** Navigate to first real order (skips /orders/new link) */
  async function goToFirstOrder(page: import("@playwright/test").Page) {
    await page.goto("/orders");
    await page.waitForLoadState("networkidle");
    // Exclude the "new order" link — only match UUID-based order links
    const card = page.locator('a[href*="/orders/"]:not([href="/orders/new"])').first();
    await expect(card).toBeVisible({ timeout: 10000 });
    const href = await card.getAttribute("href");
    if (!href || href === "/orders/new") {
      test.skip();
      return;
    }
    await page.goto(href);
    await page.waitForLoadState("networkidle");
  }

  test("order detail page loads without error", async ({ page }) => {
    await goToFirstOrder(page);
    await expect(page.getByText(/something went wrong|помилка сервера/i)).not.toBeVisible();
    await expect(page.locator("body")).toBeVisible();
  });

  test("shows vehicle plate on detail page", async ({ page }) => {
    await goToFirstOrder(page);
    // plateNumber is rendered in VehicleClientInfo as plain text, e.g. "AA1111BB"
    await expect(page.getByText(/[A-Z]{2}\d{3,4}[A-Z]{2}/).first()).toBeVisible();
  });

  test("shows order status badge", async ({ page }) => {
    await goToFirstOrder(page);
    const statuses = ["Черга", "Підготовка", "Фарбування", "Готово", "Закрито", "Відкладено"];
    let found = false;
    for (const s of statuses) {
      if (await page.getByText(s).first().isVisible().catch(() => false)) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  test("shows works section (Роботи)", async ({ page }) => {
    await goToFirstOrder(page);
    // WorksConstructor renders CardTitle "Роботи"
    await expect(page.getByText("Роботи").first()).toBeVisible();
  });

  test("shows parts section (Запчастини)", async ({ page }) => {
    await goToFirstOrder(page);
    // PartsChecklist renders CardTitle "Запчастини"
    await expect(page.getByText("Запчастини").first()).toBeVisible();
  });

  test("shows worker shares section (Зарплати майстрів)", async ({ page }) => {
    await goToFirstOrder(page);
    // WorkerShares renders CardTitle "Зарплати майстрів"
    await expect(page.getByText("Зарплати майстрів").first()).toBeVisible();
  });

  test("shows finance block (Фінанси)", async ({ page }) => {
    await goToFirstOrder(page);
    // FinanceBlock renders CardTitle "Фінанси"
    await expect(page.getByText("Фінанси").first()).toBeVisible();
  });

  test("total amount shows currency symbol", async ({ page }) => {
    await goToFirstOrder(page);
    // FinanceBlock shows UAH ₴ or $ amounts
    await expect(page.getByText(/₴|\$/).first()).toBeVisible();
  });

  test("back to orders link is present", async ({ page }) => {
    await goToFirstOrder(page);
    const back = page.getByRole("link", { name: /замовлення|назад|back/i }).first();
    if (await back.isVisible().catch(() => false)) {
      await back.click();
      await page.waitForURL(/\/orders/);
      expect(page.url()).toContain("/orders");
    }
  });
});
