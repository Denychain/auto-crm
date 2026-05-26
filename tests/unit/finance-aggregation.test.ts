import { describe, it, expect } from "vitest";
import {
  aggregateClosedPeriod,
  aggregateActiveDebt,
  buildPlanFactRows,
  buildWorkerGroups,
  DREAM_FUND_PERCENT,
  type OrderForFinance,
  type AggregationCtx,
} from "@/lib/finance-pure";

const RATE = 40; // 40 UAH per 1 USD

// ── Хелпер — мінімальне UAH-замовлення ────────────────────────────────────────
function makeOrder(overrides: Partial<OrderForFinance> = {}): OrderForFinance {
  return {
    id: "o1",
    status: "CLOSED",
    currency: "UAH",
    baseExchangeRate: null,
    advancePayment: 0,
    totalPaid: 0,
    works: [],
    parts: [],
    workerShares: [],
    client: { name: "Клієнт", phone: "0000000000" },
    vehicle: { plateNumber: "AA0001BB", make: "Toyota", model: "Camry" },
    ...overrides,
  };
}

// ── aggregateClosedPeriod ──────────────────────────────────────────────────────
describe("aggregateClosedPeriod", () => {
  const ctx: AggregationCtx = { displayCurrency: "UAH" as never, fallbackRate: RATE };

  it("UAH + USD замовлення → revenue коректний в UAH-режимі", () => {
    const orders: OrderForFinance[] = [
      makeOrder({
        id: "o1",
        works: [{ price: 10000, currency: "UAH" }],
        parts: [{ estimatedPrice: 1500, actualPrice: 1500, currency: "UAH" }],
      }),
      makeOrder({
        id: "o2",
        currency: "USD",
        works: [{ price: 200, currency: "USD", exchangeRate: RATE }], // = 8000 UAH
        parts: [{ estimatedPrice: 30, actualPrice: 30, currency: "USD", exchangeRate: RATE }], // = 1200 UAH
      }),
    ];

    const result = aggregateClosedPeriod(orders, ctx);
    // revenue: (10000+1500) + (8000+1200) = 11500 + 9200 = 20700
    expect(result.revenue).toBeCloseTo(20700);
    // materials: 1500 + 1200 = 2700
    expect(result.materials).toBeCloseTo(2700);
  });

  it("wagesMasters і wagesOwner діляться правильно", () => {
    const order = makeOrder({
      works: [{ price: 10000, currency: "UAH" }],
      parts: [],
      workerShares: [
        { workerName: "Ілля", roleSnapshot: "PAINTER", workerId: null, amount: 4000, currency: "UAH", exchangeRate: null },
        { workerName: "Тато", roleSnapshot: "OWNER", workerId: "w1", amount: 4000, currency: "UAH", exchangeRate: null },
      ],
    });

    const result = aggregateClosedPeriod([order], ctx);
    expect(result.wagesMasters).toBeCloseTo(4000);
    expect(result.wagesOwner).toBeCloseTo(4000);
  });

  it("dreamFundContribution = 5% від revenue", () => {
    const order = makeOrder({
      works: [{ price: 10000, currency: "UAH" }],
      parts: [],
    });

    const result = aggregateClosedPeriod([order], ctx);
    expect(result.dreamFundContribution).toBeCloseTo(10000 * DREAM_FUND_PERCENT);
  });

  it("unallocated ≈ 0 коли всі шари розподілені правильно", () => {
    // revenue = 10000 UAH
    // materials = 2000 UAH
    // pool = 8000 UAH → majster 4000 + owner 3500 = 7500 → dreamFund = 500
    // unallocated = 10000 - 2000 - 4000 - 3500 - 500 = 0
    const order = makeOrder({
      works: [{ price: 8000, currency: "UAH" }],
      parts: [{ estimatedPrice: 2000, actualPrice: 2000, currency: "UAH" }],
      workerShares: [
        { workerName: "Майстер", roleSnapshot: "PAINTER", workerId: null, amount: 4000, currency: "UAH", exchangeRate: null },
        { workerName: "Власник", roleSnapshot: "OWNER", workerId: "w1", amount: 3500, currency: "UAH", exchangeRate: null },
      ],
    });

    const result = aggregateClosedPeriod([order], ctx);
    expect(result.revenue).toBeCloseTo(10000);
    expect(result.dreamFundContribution).toBeCloseTo(500); // 5% × 10000
    expect(result.unallocated).toBeCloseTo(0, 1);
  });

  it("порожній список → всі нулі", () => {
    const result = aggregateClosedPeriod([], ctx);
    expect(result.revenue).toBe(0);
    expect(result.materials).toBe(0);
    expect(result.wagesMasters).toBe(0);
    expect(result.wagesOwner).toBe(0);
    expect(result.dreamFundContribution).toBe(0);
    expect(result.unallocated).toBe(0);
  });
});

// ── aggregateActiveDebt ────────────────────────────────────────────────────────
describe("aggregateActiveDebt", () => {
  const ctx: AggregationCtx = { displayCurrency: "UAH" as never, fallbackRate: RATE };

  it("3 активних + 1 POSTPONED → POSTPONED не враховується", () => {
    const orders = [
      makeOrder({ id: "a1", status: "QUEUE", works: [{ price: 1000, currency: "UAH" }], totalPaid: 0 }),
      makeOrder({ id: "a2", status: "PAINT", works: [{ price: 2000, currency: "UAH" }], totalPaid: 0 }),
      makeOrder({ id: "a3", status: "DONE", works: [{ price: 3000, currency: "UAH" }], totalPaid: 0 }),
      makeOrder({ id: "p1", status: "POSTPONED", works: [{ price: 5000, currency: "UAH" }], totalPaid: 0 }),
    ];

    const result = aggregateActiveDebt(orders, ctx);
    expect(result.debtorsCount).toBe(3);
    expect(result.totalDebt).toBeCloseTo(6000); // 1000+2000+3000, без POSTPONED
  });

  it("повністю оплачені не рахуються у борг", () => {
    const orders = [
      makeOrder({ id: "a1", works: [{ price: 1000, currency: "UAH" }], totalPaid: 1000 }),
      makeOrder({ id: "a2", works: [{ price: 500, currency: "UAH" }], totalPaid: 0 }),
    ];

    const result = aggregateActiveDebt(orders, ctx);
    expect(result.debtorsCount).toBe(1);
    expect(result.totalDebt).toBeCloseTo(500);
  });

  it("порожній список → нулі", () => {
    const result = aggregateActiveDebt([], ctx);
    expect(result.totalDebt).toBe(0);
    expect(result.debtorsCount).toBe(0);
  });
});

// ── buildPlanFactRows ──────────────────────────────────────────────────────────
describe("buildPlanFactRows", () => {
  const ctx: AggregationCtx = { displayCurrency: "UAH" as never, fallbackRate: RATE };

  it("мішані валюти запчастин → diff коректний", () => {
    const order = makeOrder({
      id: "o1",
      parts: [
        { estimatedPrice: 100, actualPrice: 120, currency: "UAH" }, // diff = +20 UAH
        { estimatedPrice: 10, actualPrice: 12, currency: "USD", exchangeRate: RATE }, // diff = +2 USD = +80 UAH
      ],
    });

    const rows = buildPlanFactRows([order], ctx);
    expect(rows).toHaveLength(1);
    expect(rows[0].planMaterials).toBeCloseTo(100 + 10 * RATE); // 100 + 400 = 500
    expect(rows[0].factMaterials).toBeCloseTo(120 + 12 * RATE); // 120 + 480 = 600
    expect(rows[0].diff).toBeCloseTo(100); // 100 UAH перевитрата
  });

  it("без actual → використовує estimated", () => {
    const order = makeOrder({
      parts: [{ estimatedPrice: 500, actualPrice: null, currency: "UAH" }],
    });

    const rows = buildPlanFactRows([order], ctx);
    expect(rows[0].diff).toBeCloseTo(0);
  });

  it("сортує за спаданням diff", () => {
    const orders = [
      makeOrder({ id: "low", parts: [{ estimatedPrice: 100, actualPrice: 110, currency: "UAH" }] }),
      makeOrder({ id: "high", parts: [{ estimatedPrice: 100, actualPrice: 200, currency: "UAH" }] }),
    ];

    const rows = buildPlanFactRows(orders, ctx);
    expect(rows[0].id).toBe("high");
  });
});

// ── buildWorkerGroups ──────────────────────────────────────────────────────────
describe("buildWorkerGroups", () => {
  const ctx: AggregationCtx = { displayCurrency: "UAH" as never, fallbackRate: RATE };

  it("OWNER позначений isOwner=true", () => {
    const order = makeOrder({
      workerShares: [
        { workerName: "Тато", roleSnapshot: "OWNER", workerId: "w1", amount: 5000, currency: "UAH", exchangeRate: null },
        { workerName: "Ілля", roleSnapshot: "PAINTER", workerId: "w2", amount: 3000, currency: "UAH", exchangeRate: null },
      ],
    });

    const groups = buildWorkerGroups([order], ctx);
    const owner = groups.find((g) => g.isOwner);
    const master = groups.find((g) => !g.isOwner);

    expect(owner).toBeDefined();
    expect(owner!.workerName).toBe("Тато");
    expect(master!.workerName).toBe("Ілля");
  });

  it("USD-виплата конвертується до UAH через per-record exchangeRate", () => {
    const order = makeOrder({
      workerShares: [
        {
          workerName: "Майстер",
          roleSnapshot: "PAINTER",
          workerId: null,
          amount: 100,
          currency: "USD",
          exchangeRate: RATE, // 100 USD × 40 = 4000 UAH
        },
      ],
    });

    const groups = buildWorkerGroups([order], ctx);
    expect(groups[0].total).toBeCloseTo(4000);
    expect(groups[0].orders[0].amount).toBeCloseTo(4000);
  });

  it("однаковий майстер в двох замовленнях → один рядок з сумою", () => {
    const orders = [
      makeOrder({
        id: "o1",
        workerShares: [
          { workerName: "Майстер", roleSnapshot: "PAINTER", workerId: "w1", amount: 2000, currency: "UAH", exchangeRate: null },
        ],
      }),
      makeOrder({
        id: "o2",
        workerShares: [
          { workerName: "Майстер", roleSnapshot: "PAINTER", workerId: "w1", amount: 3000, currency: "UAH", exchangeRate: null },
        ],
      }),
    ];

    const groups = buildWorkerGroups(orders, ctx);
    expect(groups).toHaveLength(1);
    expect(groups[0].total).toBeCloseTo(5000);
    expect(groups[0].orders).toHaveLength(2);
  });
});
