import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDateRangeForPeriod, handleOrderClosed } from "@/lib/finance";
import { Currency } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

const mockPrisma = vi.mocked(prisma);
import {
  startOfDay, endOfDay,
  startOfWeek, endOfWeek,
  startOfMonth, endOfMonth,
} from "date-fns";

// ── getDateRangeForPeriod ─────────────────────────────────────────────────────
describe("getDateRangeForPeriod", () => {
  it('period "day" returns today start→end', () => {
    const now = new Date();
    const range = getDateRangeForPeriod("day");
    expect(range.from.getTime()).toBeCloseTo(startOfDay(now).getTime(), -3);
    expect(range.to.getTime()).toBeCloseTo(endOfDay(now).getTime(), -3);
  });

  it('period "week" returns Mon→Sun of current week', () => {
    const now = new Date();
    const range = getDateRangeForPeriod("week");
    expect(range.from.getTime()).toBeCloseTo(
      startOfWeek(now, { weekStartsOn: 1 }).getTime(), -3
    );
    expect(range.to.getTime()).toBeCloseTo(
      endOfWeek(now, { weekStartsOn: 1 }).getTime(), -3
    );
  });

  it('period "month" returns first→last day of month', () => {
    const now = new Date();
    const range = getDateRangeForPeriod("month");
    expect(range.from.getTime()).toBeCloseTo(startOfMonth(now).getTime(), -3);
    expect(range.to.getTime()).toBeCloseTo(endOfMonth(now).getTime(), -3);
  });

  it('period "all" returns epoch→far future', () => {
    const range = getDateRangeForPeriod("all");
    expect(range.from.getTime()).toBe(new Date(0).getTime());
    expect(range.to.getFullYear()).toBeGreaterThanOrEqual(2099);
  });

  it('period "custom" uses from/to params', () => {
    const range = getDateRangeForPeriod("custom", "2024-01-01", "2024-01-31");
    expect(range.from.toISOString().startsWith("2024-01-01")).toBe(true);
    expect(range.to.toISOString().startsWith("2024-01-31")).toBe(true);
  });

  it('unknown period falls back to "all"', () => {
    const range = getDateRangeForPeriod("unknown-period");
    expect(range.from.getTime()).toBe(new Date(0).getTime());
  });
});

// ── handleOrderClosed ─────────────────────────────────────────────────────────
describe("handleOrderClosed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockOrder = {
    id: "order-1",
    works: [{ price: 10000 }],
    parts: [],
  };

  const mockFund = {
    id: "fund-1",
    goalName: "Нова камера",
    targetAmount: new Decimal(5000),
    currentAmount: new Decimal(1000),
  };

  it("adds 5% of order total to DreamFund", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as never);
    mockPrisma.dreamFund.findMany.mockResolvedValue([mockFund] as never);
    mockPrisma.dreamFund.update.mockResolvedValue({} as never);

    await handleOrderClosed("order-1");

    expect(mockPrisma.dreamFund.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "fund-1" },
        data: { currentAmount: { increment: 500 } }, // 10000 * 0.05
      })
    );
  });

  it("does nothing if order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await handleOrderClosed("nonexistent");
    expect(mockPrisma.dreamFund.update).not.toHaveBeenCalled();
  });

  it("does nothing if no active DreamFund (all completed)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as never);
    mockPrisma.dreamFund.findMany.mockResolvedValue([
      {
        ...mockFund,
        currentAmount: new Decimal(5000), // already at target
        targetAmount: new Decimal(5000),
      },
    ] as never);

    await handleOrderClosed("order-1");
    expect(mockPrisma.dreamFund.update).not.toHaveBeenCalled();
  });

  it("does nothing if no DreamFunds at all", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as never);
    mockPrisma.dreamFund.findMany.mockResolvedValue([]);

    await handleOrderClosed("order-1");
    expect(mockPrisma.dreamFund.update).not.toHaveBeenCalled();
  });

  it("picks first non-completed fund", async () => {
    const completedFund = { ...mockFund, id: "fund-completed", currentAmount: new Decimal(5000), targetAmount: new Decimal(5000) };
    const activeFund = { ...mockFund, id: "fund-active", currentAmount: new Decimal(0), targetAmount: new Decimal(3000) };

    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as never);
    mockPrisma.dreamFund.findMany.mockResolvedValue([completedFund, activeFund] as never);
    mockPrisma.dreamFund.update.mockResolvedValue({} as never);

    await handleOrderClosed("order-1");

    expect(mockPrisma.dreamFund.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "fund-active" } })
    );
  });

  it("uses actualPrice for parts when calculating 5%", async () => {
    const orderWithParts = {
      id: "order-2",
      works: [{ price: 5000 }],
      parts: [{ estimatedPrice: 1000, actualPrice: 2000 }], // actualPrice wins
    };
    // total = 5000 + 2000 = 7000, 5% = 350
    mockPrisma.order.findUnique.mockResolvedValue(orderWithParts as never);
    mockPrisma.dreamFund.findMany.mockResolvedValue([mockFund] as never);
    mockPrisma.dreamFund.update.mockResolvedValue({} as never);

    await handleOrderClosed("order-2");

    expect(mockPrisma.dreamFund.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { currentAmount: { increment: 350 } },
      })
    );
  });
});
