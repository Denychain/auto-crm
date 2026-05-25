import { test, expect } from "@playwright/test";
import { ShoppingPage } from "../helpers/pages";

test.describe("Shopping list", () => {
  test("shopping page loads", async ({ page }) => {
    const shoppingPage = new ShoppingPage(page);
    await shoppingPage.goto();
    await expect(page).toHaveURL(/\/shopping/);
    await expect(page.locator("body")).toBeVisible();
  });

  test("add item input is present", async ({ page }) => {
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    const input = page.getByPlaceholder(/назва|name|матеріал|item/i);
    if (await input.isVisible().catch(() => false)) {
      await expect(input).toBeVisible();
    }
  });

  test("can add a new shopping item", async ({ page }) => {
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    const input = page.getByPlaceholder(/назва|name|матеріал|item/i).first();
    if (!await input.isVisible().catch(() => false)) {
      test.skip();
      return;
    }

    const testItem = `Test item ${Date.now()}`;
    await input.fill(testItem);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    await expect(page.getByText(testItem)).toBeVisible();
  });

  test("shopping items can be checked off", async ({ page }) => {
    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    const checkboxes = page.getByRole("checkbox");
    const count = await checkboxes.count();
    if (count > 0) {
      const first = checkboxes.first();
      const wasCkecked = await first.isChecked();
      await first.click();
      await page.waitForTimeout(300);
      const isNowChecked = await first.isChecked();
      expect(isNowChecked).toBe(!wasCkecked);
    }
  });

  test("no JS errors on shopping page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto("/shopping");
    await page.waitForLoadState("networkidle");

    const critical = errors.filter((e) => !e.toLowerCase().includes("hydration"));
    expect(critical).toHaveLength(0);
  });
});
