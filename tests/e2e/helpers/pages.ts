/**
 * Page Object helpers for E2E tests.
 * Each class wraps Playwright's Page with domain-specific selectors.
 */
import { type Page, type Locator, expect } from "@playwright/test";

// ── Base ──────────────────────────────────────────────────────────────────────
export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string) {
    await this.page.goto(path);
    await this.page.waitForLoadState("networkidle");
  }

  /** Wait for toast/sonner notification */
  async expectToast(text: string | RegExp) {
    await expect(this.page.locator("[data-sonner-toast]")).toContainText(text);
  }
}

// ── DashboardPage ─────────────────────────────────────────────────────────────
export class DashboardPage extends BasePage {
  async goto() {
    await this.navigate("/dashboard");
  }

  get statsCards() {
    return this.page.locator("[data-testid='stat-card'], .stat-card, [class*='stat']").first();
  }

  get ordersInProgress() {
    return this.page.getByText(/в роботі|in progress/i);
  }

  get revenue() {
    return this.page.getByText(/виручка|revenue/i);
  }
}

// ── OrdersPage (Kanban) ───────────────────────────────────────────────────────
export class OrdersPage extends BasePage {
  async goto() {
    await this.navigate("/orders");
  }

  /** All kanban columns */
  get columns() {
    return this.page.locator("[data-column], [class*='column'], [class*='kanban']");
  }

  /** Order cards on the board */
  get cards() {
    return this.page.locator("[data-order-id], [class*='order-card']");
  }

  async openOrder(plate: string) {
    await this.page.getByText(plate).first().click();
    await this.page.waitForURL(/\/orders\//);
  }

  async createOrder(plate: string) {
    const btn = this.page.getByRole("button", { name: /новий|new|додати|add/i }).first();
    await btn.click();
    await this.page.getByPlaceholder(/номер|plate/i).fill(plate);
    await this.page.getByRole("button", { name: /зберегти|save|створити|create/i }).click();
  }
}

// ── OrderDetailPage ───────────────────────────────────────────────────────────
export class OrderDetailPage extends BasePage {
  async goto(orderId: string) {
    await this.navigate(`/orders/${orderId}`);
  }

  get statusBadge() {
    return this.page.locator("[data-testid='order-status'], [class*='status-badge']").first();
  }

  get totalAmount() {
    return this.page.locator("[data-testid='order-total']").first();
  }

  get workerSharesSection() {
    return this.page.getByText(/розподіл|виплати|shares/i).first();
  }

  async addWork(name: string, price: number) {
    await this.page.getByRole("button", { name: /додати роботу|add work/i }).click();
    await this.page.getByPlaceholder(/назва|name/i).last().fill(name);
    await this.page.getByPlaceholder(/ціна|price/i).last().fill(String(price));
    await this.page.keyboard.press("Enter");
  }

  async changeStatus(status: string) {
    const btn = this.page.getByRole("button", { name: new RegExp(status, "i") });
    await btn.click();
  }
}

// ── ClientsPage ───────────────────────────────────────────────────────────────
export class ClientsPage extends BasePage {
  async goto() {
    await this.navigate("/clients");
  }

  get clientRows() {
    return this.page.locator("table tbody tr, [class*='client-row']");
  }

  get searchInput() {
    return this.page.getByPlaceholder(/пошук|search/i);
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(300); // debounce
  }

  async openClient(name: string) {
    await this.page.getByText(name).first().click();
  }
}

// ── FinancePage ───────────────────────────────────────────────────────────────
export class FinancePage extends BasePage {
  async goto() {
    await this.navigate("/finance");
  }

  get periodSelector() {
    return this.page.getByRole("combobox").first();
  }

  async selectPeriod(period: "day" | "week" | "month" | "all") {
    await this.periodSelector.click();
    await this.page.getByRole("option", { name: new RegExp(period, "i") }).click();
  }

  get revenueTotal() {
    return this.page.locator("[data-testid='revenue-total']").first();
  }
}

// ── ShoppingPage ──────────────────────────────────────────────────────────────
export class ShoppingPage extends BasePage {
  async goto() {
    await this.navigate("/shopping");
  }

  get items() {
    return this.page.locator("[class*='shopping-item'], li[class*='item']");
  }

  async addItem(name: string) {
    const input = this.page.getByPlaceholder(/назва|name|матеріал/i);
    await input.fill(name);
    await this.page.keyboard.press("Enter");
  }
}

// ── BacklogPage ───────────────────────────────────────────────────────────────
export class BacklogPage extends BasePage {
  async goto() {
    await this.navigate("/backlog");
  }

  get tasks() {
    return this.page.locator("[class*='task'], [class*='backlog-item']");
  }
}
