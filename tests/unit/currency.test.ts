import { describe, it, expect } from "vitest";
import {
  convert,
  normalizeToUSD,
  formatMoney,
  formatMoneyShort,
  parseMoneyInput,
} from "@/lib/currency";
import { Currency } from "@prisma/client";

// UAH format uses non-breaking space (U+00A0) as thousands separator and before ₴
const NBSP = " ";

// ── convert ───────────────────────────────────────────────────────────────────
describe("convert", () => {
  const RATE = 40;

  it("USD → UAH multiplies by rate", () => {
    expect(convert({ amount: 100, currency: Currency.USD }, Currency.UAH, RATE)).toBe(4000);
  });

  it("UAH → USD divides by rate", () => {
    expect(convert({ amount: 4000, currency: Currency.UAH }, Currency.USD, RATE)).toBe(100);
  });

  it("same currency returns amount unchanged", () => {
    expect(convert({ amount: 500, currency: Currency.UAH }, Currency.UAH, RATE)).toBe(500);
    expect(convert({ amount: 50, currency: Currency.USD }, Currency.USD, RATE)).toBe(50);
  });

  it("uses exchangeRate from money object when rate arg omitted", () => {
    expect(
      convert({ amount: 10, currency: Currency.USD, exchangeRate: 42 }, Currency.UAH)
    ).toBe(420);
  });

  it("falls back to 41 when rate is 0/missing", () => {
    const result = convert({ amount: 100, currency: Currency.USD }, Currency.UAH, 0);
    expect(result).toBe(4100); // 100 * 41 fallback
  });

  it("handles Decimal-like exchangeRate", () => {
    const money = {
      amount: 100,
      currency: Currency.USD,
      exchangeRate: { toNumber: () => 38 } as never,
    };
    expect(convert(money, Currency.UAH)).toBe(3800);
  });
});

// ── normalizeToUSD ────────────────────────────────────────────────────────────
describe("normalizeToUSD", () => {
  it("USD stays unchanged", () => {
    expect(normalizeToUSD(100, Currency.USD, 41)).toBe(100);
  });

  it("UAH is divided by rate", () => {
    expect(normalizeToUSD(8200, Currency.UAH, 41)).toBeCloseTo(200);
  });

  it("uses historical rate, not current", () => {
    // historical rate = 38, current irrelevant
    expect(normalizeToUSD(3800, Currency.UAH, 38)).toBeCloseTo(100);
  });

  it("falls back to 41 when rate is 0", () => {
    expect(normalizeToUSD(4100, Currency.UAH, 0)).toBeCloseTo(100);
  });
});

// ── formatMoney ───────────────────────────────────────────────────────────────
describe("formatMoney", () => {
  describe("USD", () => {
    it("formats integer USD", () => {
      expect(formatMoney(1234, Currency.USD)).toBe("$1,234");
    });

    it("formats USD with cents", () => {
      expect(formatMoney(1234.5, Currency.USD)).toBe("$1,234.50");
    });

    it("formats zero USD", () => {
      expect(formatMoney(0, Currency.USD)).toBe("$0");
    });

    it("formats large USD", () => {
      expect(formatMoney(1_000_000, Currency.USD)).toBe("$1,000,000");
    });

    it("hides .00 cents", () => {
      expect(formatMoney(100.0, Currency.USD)).toBe("$100");
    });
  });

  describe("UAH", () => {
    it("formats integer UAH with nbsp separator", () => {
      expect(formatMoney(1234, Currency.UAH)).toBe(`1${NBSP}234${NBSP}₴`);
    });

    it("formats UAH with kopecks", () => {
      expect(formatMoney(1234.5, Currency.UAH)).toBe(`1${NBSP}234,50${NBSP}₴`);
    });

    it("formats zero UAH", () => {
      expect(formatMoney(0, Currency.UAH)).toBe(`0${NBSP}₴`);
    });

    it("hides ,00 kopecks", () => {
      expect(formatMoney(5000.0, Currency.UAH)).toBe(`5${NBSP}000${NBSP}₴`);
    });

    it("defaults to UAH when currency omitted", () => {
      expect(formatMoney(500)).toContain("₴");
      expect(formatMoney(500)).toContain("500");
    });
  });
});

// ── formatMoneyShort ──────────────────────────────────────────────────────────
describe("formatMoneyShort", () => {
  it("shows k format for 1000+", () => {
    const r = formatMoneyShort(1200, Currency.UAH);
    expect(r).toContain("1,2k");
    expect(r).toContain("₴");
  });

  it("shows full format below 1000", () => {
    const r = formatMoneyShort(999, Currency.UAH);
    expect(r).toContain("999");
    expect(r).toContain("₴");
  });

  it("USD k format", () => {
    expect(formatMoneyShort(2500, Currency.USD)).toBe("$2,5k");
  });
});

// ── parseMoneyInput ───────────────────────────────────────────────────────────
describe("parseMoneyInput", () => {
  it('parses "$300" as USD 300', () => {
    const result = parseMoneyInput("$300");
    expect(result.amount).toBe(300);
    expect(result.currency).toBe(Currency.USD);
  });

  it('parses "12 000 грн" as UAH 12000', () => {
    const result = parseMoneyInput("12 000 грн");
    expect(result.amount).toBe(12000);
    expect(result.currency).toBe(Currency.UAH);
  });

  it('parses "₴ 500" as UAH', () => {
    const result = parseMoneyInput("₴ 500");
    expect(result.amount).toBe(500);
    expect(result.currency).toBe(Currency.UAH);
  });

  it('parses "UAH 1500" as UAH', () => {
    const result = parseMoneyInput("UAH 1500");
    expect(result.amount).toBe(1500);
    expect(result.currency).toBe(Currency.UAH);
  });

  it("returns null currency for plain number", () => {
    const result = parseMoneyInput("5000");
    expect(result.amount).toBe(5000);
    expect(result.currency).toBeNull();
  });

  it("handles decimal input", () => {
    const result = parseMoneyInput("$99.99");
    expect(result.amount).toBeCloseTo(99.99);
  });

  it("handles comma decimal", () => {
    const result = parseMoneyInput("1 234,50 ₴");
    expect(result.amount).toBeCloseTo(1234.5);
  });

  it("returns 0 for empty/invalid input", () => {
    expect(parseMoneyInput("").amount).toBe(0);
    expect(parseMoneyInput("abc").amount).toBe(0);
  });
});
