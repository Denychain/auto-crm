import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcOrderTotal, calcDebt, calcIdleDays, isOverdue, formatPlate, cn } from "@/lib/utils";
import { computeOrderTotals, computeOrderDebt, aggregateDebtors } from "@/lib/finance-pure";
import { OrderStatus, Currency } from "@prisma/client";

// ── cn (tailwind merge) ────────────────────────────────────────────────────────
describe("cn", () => {
  it("merges class strings", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });
  it("deduplicates conflicting tailwind classes (last wins)", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });
  it("handles conditional classes", () => {
    expect(cn("base", false && "skip", "keep")).toBe("base keep");
  });
  it("handles undefined / null gracefully", () => {
    expect(cn("base", undefined, null as never)).toBe("base");
  });
});

// ── calcOrderTotal ─────────────────────────────────────────────────────────────
describe("calcOrderTotal", () => {
  it("sums works prices", () => {
    const works = [{ price: 500 }, { price: 300 }];
    expect(calcOrderTotal(works, [])).toBe(800);
  });

  it("uses actualPrice when set", () => {
    const parts = [{ estimatedPrice: 200, actualPrice: 250 }];
    expect(calcOrderTotal([], parts)).toBe(250);
  });

  it("falls back to estimatedPrice when actualPrice is null", () => {
    const parts = [{ estimatedPrice: 200, actualPrice: null }];
    expect(calcOrderTotal([], parts)).toBe(200);
  });

  it("sums works + parts together", () => {
    const works = [{ price: 1000 }];
    const parts = [
      { estimatedPrice: 100, actualPrice: 150 },
      { estimatedPrice: 200, actualPrice: null },
    ];
    expect(calcOrderTotal(works, parts)).toBe(1350); // 1000 + 150 + 200
  });

  it("returns 0 for empty arrays", () => {
    expect(calcOrderTotal([], [])).toBe(0);
  });

  it("handles Decimal-like objects (toNumber())", () => {
    const works = [{ price: { toNumber: () => 999 } }];
    expect(calcOrderTotal(works, [])).toBe(999);
  });
});

// ── calcDebt ──────────────────────────────────────────────────────────────────
describe("calcDebt", () => {
  function makeOrder(works: number[], parts: number[], totalPaid: number, advance: number) {
    return {
      estimatedPrice: 0,
      totalPaid,
      advancePayment: advance,
      works: works.map((p) => ({ price: p })),
      parts: parts.map((p) => ({ estimatedPrice: p, actualPrice: null })),
    };
  }

  it("zero debt when fully paid", () => {
    const o = makeOrder([1000], [], 1000, 0);
    expect(calcDebt(o)).toBe(0);
  });

  it("calculates remaining debt", () => {
    const o = makeOrder([5000], [], 2000, 1000);
    expect(calcDebt(o)).toBe(2000); // 5000 - 2000 - 1000
  });

  it("negative debt (overpaid)", () => {
    const o = makeOrder([1000], [], 1500, 0);
    expect(calcDebt(o)).toBe(-500);
  });

  it("considers advance payment", () => {
    const o = makeOrder([10000], [500], 0, 3000);
    expect(calcDebt(o)).toBe(7500); // 10500 - 0 - 3000
  });
});

// ── calcIdleDays ───────────────────────────────────────────────────────────────
describe("calcIdleDays", () => {
  it("returns 0 when readyDate is null", () => {
    expect(calcIdleDays(null)).toBe(0);
  });

  it("returns 0 when readyDate is undefined", () => {
    expect(calcIdleDays(undefined)).toBe(0);
  });

  it("returns ~0 for today", () => {
    expect(calcIdleDays(new Date())).toBe(0);
  });

  it("returns correct days for past date", () => {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    expect(calcIdleDays(fiveDaysAgo)).toBe(5);
  });

  it("returns correct days for 1 day ago", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(calcIdleDays(yesterday)).toBe(1);
  });
});

// ── isOverdue ─────────────────────────────────────────────────────────────────
describe("isOverdue", () => {
  it("returns false when status is not DONE", () => {
    const order = {
      status: OrderStatus.PAINT,
      readyDate: new Date(Date.now() - 10 * 86400_000),
    };
    expect(isOverdue(order)).toBe(false);
  });

  it("returns false when readyDate is null", () => {
    expect(isOverdue({ status: OrderStatus.DONE, readyDate: null })).toBe(false);
  });

  it("returns false when 3 days exactly (threshold is >3)", () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    // IDLE_THRESHOLD_DAYS = 3, isOverdue checks > threshold, so 3 days → false
    const result = isOverdue({ status: OrderStatus.DONE, readyDate: threeDaysAgo });
    // With differenceInDays (floor), 3 days = 3, and we check > 3, so false
    expect(result).toBe(false);
  });

  it("returns true when DONE for 4+ days", () => {
    const fourDaysAgo = new Date();
    fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
    expect(isOverdue({ status: OrderStatus.DONE, readyDate: fourDaysAgo })).toBe(true);
  });
});

// ── formatPlate ───────────────────────────────────────────────────────────────
describe("formatPlate", () => {
  it("formats standard UA plate correctly", () => {
    expect(formatPlate("AA1234BB")).toBe("AA 1234 BB");
  });

  it("handles already spaced input", () => {
    expect(formatPlate("AA 1234 BB")).toBe("AA 1234 BB");
  });

  it("uppercases lowercase input", () => {
    expect(formatPlate("aa1234bb")).toBe("AA 1234 BB");
  });

  it("returns non-standard plates as-is (uppercased)", () => {
    expect(formatPlate("DIPLOMAT")).toBe("DIPLOMAT");
  });

  it("handles 3-digit number plates", () => {
    expect(formatPlate("AA123BB")).toBe("AA 123 BB");
  });
});

// ── computeOrderTotals ────────────────────────────────────────────────────────
describe("computeOrderTotals", () => {
  const RATE = 40; // 40 UAH per 1 USD

  it("повністю UAH-замовлення в UAH-режимі", () => {
    const order = {
      currency: "UAH",
      advancePayment: 0,
      totalPaid: 0,
      works: [{ price: 1000, currency: "UAH" }, { price: 500, currency: "UAH" }],
      parts: [{ estimatedPrice: 200, actualPrice: null, currency: "UAH" }],
    };
    const t = computeOrderTotals(order, Currency.UAH, RATE);
    expect(t.worksTotal).toBe(1500);
    expect(t.partsActualTotal).toBe(200);
    expect(t.orderTotal).toBe(1700);
    expect(t.outstanding).toBe(1700);
  });

  it("повністю UAH-замовлення в USD-режимі конвертується через rate", () => {
    const order = {
      currency: "UAH",
      advancePayment: 0,
      totalPaid: 0,
      works: [{ price: 4000, currency: "UAH" }],
      parts: [],
    };
    const t = computeOrderTotals(order, Currency.USD, RATE);
    expect(t.worksTotal).toBeCloseTo(100); // 4000 / 40
    expect(t.orderTotal).toBeCloseTo(100);
  });

  it("повністю USD-замовлення в UAH-режимі конвертується через rate", () => {
    const order = {
      currency: "USD",
      advancePayment: 0,
      totalPaid: 0,
      works: [{ price: 50, currency: "USD", exchangeRate: 40 }],
      parts: [],
    };
    const t = computeOrderTotals(order, Currency.UAH, RATE);
    expect(t.worksTotal).toBeCloseTo(2000); // 50 * 40
    expect(t.orderTotal).toBeCloseTo(2000);
  });

  it("мішані роботи (USD + UAH) рахуються коректно в USD-режимі", () => {
    const order = {
      currency: "UAH",
      advancePayment: 0,
      totalPaid: 0,
      works: [
        { price: 50, currency: "USD", exchangeRate: 40 }, // = $50
        { price: 800, currency: "UAH", exchangeRate: 40 }, // = $20 (800/40)
      ],
      parts: [],
    };
    const t = computeOrderTotals(order, Currency.USD, RATE);
    expect(t.worksTotal).toBeCloseTo(70); // 50 + 20
    expect(t.orderTotal).toBeCloseTo(70);
  });

  it("outstanding = 0 якщо повністю оплачено", () => {
    const order = {
      currency: "UAH",
      advancePayment: 500,
      totalPaid: 1500,
      works: [{ price: 2000, currency: "UAH" }],
      parts: [],
    };
    const t = computeOrderTotals(order, Currency.UAH, RATE);
    expect(t.outstanding).toBe(0);
  });

  it("outstanding враховує аванс і оплату з конверсією", () => {
    // Замовлення в UAH, оплата в UAH, дивимось в USD
    const order = {
      currency: "UAH",
      advancePayment: 400, // = $10 в UAH
      totalPaid: 0,
      works: [{ price: 2000, currency: "UAH" }], // = $50 в UAH
      parts: [],
    };
    const t = computeOrderTotals(order, Currency.USD, RATE);
    expect(t.orderTotal).toBeCloseTo(50);   // 2000/40
    expect(t.advance).toBeCloseTo(10);      // 400/40
    expect(t.outstanding).toBeCloseTo(40);  // 50 - 10
  });
});

// ── computeOrderDebt ──────────────────────────────────────────────────────────
describe("computeOrderDebt", () => {
  const RATE = 40;

  it("UAH-замовлення: борг в UAH і USD коректний", () => {
    const order = {
      currency: "UAH",
      advancePayment: 0,
      totalPaid: 0,
      works: [{ price: 1000, currency: "UAH" }],
      parts: [],
    };
    const d = computeOrderDebt(order, Currency.UAH, RATE);
    expect(d.orderCurrency).toBe(Currency.UAH);
    expect(d.debtInOrderCurrency).toBe(1000);
    expect(d.isPaid).toBe(false);

    const dUsd = computeOrderDebt(order, Currency.USD, RATE);
    expect(dUsd.debtInDisplayCurrency).toBeCloseTo(25); // 1000/40
  });

  it("USD-замовлення: борг в обох валютах коректний", () => {
    const order = {
      currency: "USD",
      advancePayment: 0,
      totalPaid: 0,
      works: [{ price: 50, currency: "USD", exchangeRate: 40 }],
      parts: [],
    };
    const d = computeOrderDebt(order, Currency.USD, RATE);
    expect(d.orderCurrency).toBe(Currency.USD);
    expect(d.debtInOrderCurrency).toBeCloseTo(50);
    expect(d.debtInDisplayCurrency).toBeCloseTo(50);

    const dUah = computeOrderDebt(order, Currency.UAH, RATE);
    expect(dUah.debtInDisplayCurrency).toBeCloseTo(2000); // 50 * 40
  });

  it("isPaid = true коли борг = 0", () => {
    const order = {
      currency: "UAH",
      advancePayment: 0,
      totalPaid: 1000,
      works: [{ price: 1000, currency: "UAH" }],
      parts: [],
    };
    const d = computeOrderDebt(order, Currency.UAH, RATE);
    expect(d.isPaid).toBe(true);
    expect(d.debtInOrderCurrency).toBe(0);
  });
});

// ── aggregateDebtors ──────────────────────────────────────────────────────────
describe("aggregateDebtors", () => {
  const RATE = 40;

  it("агрегує 3 замовлення з різними валютами — totalDebt коректний", () => {
    const orders = [
      {
        id: "o1",
        currency: "UAH",
        advancePayment: 0,
        totalPaid: 0,
        works: [{ price: 1000, currency: "UAH" }], // борг 1000 UAH = $25
        parts: [],
        client: { name: "Клієнт 1", phone: "0001" },
        vehicle: { plateNumber: "AA0001BB", make: "Toyota", model: "Camry" },
      },
      {
        id: "o2",
        currency: "USD",
        advancePayment: 0,
        totalPaid: 0,
        works: [{ price: 50, currency: "USD", exchangeRate: 40 }], // борг $50 = 2000 UAH
        parts: [],
        client: { name: "Клієнт 2", phone: "0002" },
        vehicle: { plateNumber: "BB0002CC", make: "Honda", model: "Civic" },
      },
      {
        id: "o3",
        currency: "UAH",
        advancePayment: 0,
        totalPaid: 0,
        works: [{ price: 800, currency: "UAH" }], // борг 800 UAH = $20
        parts: [],
        client: { name: "Клієнт 3", phone: "0003" },
        vehicle: { plateNumber: "CC0003DD", make: "BMW", model: "3 Series" },
      },
    ];

    // В UAH: 1000 + (50*40) + 800 = 3800 ₴
    const { debtors: uahDebtors, totalDebt: totalUAH } = aggregateDebtors(
      orders,
      Currency.UAH,
      RATE
    );
    expect(uahDebtors).toHaveLength(3);
    expect(totalUAH).toBeCloseTo(3800);
    // Сортовано за спаданням: o2=2000, o3=800, o1=1000 → [o2=2000, o1=1000, o3=800]
    expect(uahDebtors[0].orderId).toBe("o2");
    expect(uahDebtors[0].debt).toBeCloseTo(2000);

    // В USD: (1000/40) + 50 + (800/40) = 25 + 50 + 20 = 95 $
    const { debtors: usdDebtors, totalDebt: totalUSD } = aggregateDebtors(
      orders,
      Currency.USD,
      RATE
    );
    expect(usdDebtors).toHaveLength(3);
    expect(totalUSD).toBeCloseTo(95);
  });

  it("фільтрує повністю оплачені замовлення", () => {
    const orders = [
      {
        id: "o1",
        currency: "UAH",
        advancePayment: 0,
        totalPaid: 1000,
        works: [{ price: 1000, currency: "UAH" }], // paid
        parts: [],
        client: { name: "Клієнт 1", phone: "0001" },
        vehicle: { plateNumber: "AA0001BB", make: "Toyota", model: "Camry" },
      },
      {
        id: "o2",
        currency: "UAH",
        advancePayment: 0,
        totalPaid: 0,
        works: [{ price: 500, currency: "UAH" }], // unpaid
        parts: [],
        client: { name: "Клієнт 2", phone: "0002" },
        vehicle: { plateNumber: "BB0002CC", make: "Honda", model: "Civic" },
      },
    ];
    const { debtors, totalDebt } = aggregateDebtors(orders, Currency.UAH, RATE);
    expect(debtors).toHaveLength(1);
    expect(debtors[0].orderId).toBe("o2");
    expect(totalDebt).toBe(500);
  });
});
