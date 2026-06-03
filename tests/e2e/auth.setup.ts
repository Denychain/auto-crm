import { test as setup, expect } from "@playwright/test";

// Зберігаємо сесію один раз і перевикористовуємо у всіх проєктах через
// use.storageState (див. playwright.config.ts). Так захищені CRM-сторінки
// не редіректять на /login.
const authFile = "tests/e2e/.auth/owner.json";

setup("authenticate", async ({ page }) => {
  const email = process.env.SEED_E2E_EMAIL || "owner@nice.car.if";
  const password = process.env.SEED_OWNER_PASSWORD;

  if (!password) {
    throw new Error(
      "SEED_OWNER_PASSWORD не заданий у .env — неможливо залогінитись для e2e. " +
        "Переконайся, що БД засіджена (npm run seed) і пароль у .env."
    );
  }

  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /увійти/i }).click();

  // Після успішного входу LoginForm робить router.push("/dashboard").
  // Великий таймаут — щоб пережити перший компайл (next dev) і прокидання Neon.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
  });
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  await page.context().storageState({ path: authFile });
});
