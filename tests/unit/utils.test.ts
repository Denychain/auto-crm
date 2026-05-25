import { describe, it, expect, vi, beforeEach } from "vitest";
import { calcOrderTotal, calcDebt, calcIdleDays, isOverdue, formatPlate, cn } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

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
