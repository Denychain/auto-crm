import { defineConfig, devices } from "@playwright/test";

// Завантажуємо .env у процес Playwright, щоб auth.setup.ts мав доступ до
// SEED_OWNER_PASSWORD (Playwright не читає .env автоматично).
try {
  process.loadEnvFile(".env");
} catch {
  // .env може бути відсутній у CI — змінні передаються іншим способом
}

// Збережена сесія залогіненого власника (створюється в auth.setup.ts)
const STORAGE_STATE = "tests/e2e/.auth/owner.json";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: "**/*.spec.ts",
  timeout: 45_000, // дає першому компайлу маршруту в next dev завершитись під навантаженням
  expect: { timeout: 15_000 },
  fullyParallel: false, // sequential — shared test DB
  retries: 1, // гасить cold-start (перший компайл next dev + прокидання Neon)
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "uk-UA",
    timezoneId: "Europe/Kyiv",
  },

  projects: [
    // 1) Логін один раз → storageState
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit-mobile",
      use: {
        ...devices["iPhone 13"],
        storageState: STORAGE_STATE,
      },
      testMatch: ["**/mobile/**/*.spec.ts", "**/critical-mobile.spec.ts"],
      dependencies: ["setup"],
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
