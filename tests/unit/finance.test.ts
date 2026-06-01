import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDateRangeForPeriod, handleOrderClosed } from "@/lib/finance";
import { getPaymentStatus } from "@/lib/finance-pure";
import { Currency } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

// requireAuth тягне next-auth (@/auth) — мокаємо, щоб тести з server actions
// не падали на резолві next/server у jsdom-середовищі.
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", name: "Test" }),
  getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", name: "Test" }),
}));

import { createOrderWithPhotos } from "@/app/(crm)/orders/new/actions";
import { updateWorkerShareAmount } from "@/app/(crm)/orders/[id]/actions";

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

// ── createOrderWithPhotos: збереження валюти (ext.change #12) ──────────────────
describe("createOrderWithPhotos currency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // getCurrentRate() → читає кешований курс із БД
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({ usdToUah: new Decimal(40) } as never);
    mockPrisma.client.upsert.mockResolvedValue({ id: "c1" } as never);
    mockPrisma.vehicle.upsert.mockResolvedValue({ id: "v1" } as never);
    mockPrisma.order.create.mockResolvedValue({ id: "o1" } as never);
  });

  const baseInput = {
    plate: "AA1234BB",
    make: "BMW",
    model: "X5",
    clientName: "Іван",
    clientPhone: "+380671112233",
    estimatedPrice: 1000,
    advancePayment: 200,
    photoUrls: [] as string[],
  };

  it("stores currency=USD when order created in USD", async () => {
    await createOrderWithPhotos({ ...baseInput, currency: Currency.USD });

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: Currency.USD }),
      })
    );
  });

  it("defaults to UAH when currency omitted", async () => {
    await createOrderWithPhotos(baseInput);

    expect(mockPrisma.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: Currency.UAH }),
      })
    );
  });
});

// ── updateWorkerShareAmount: фіксована сума у $ не масштабується (ext.change #12) ─
describe("updateWorkerShareAmount currency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({ usdToUah: new Decimal(40) } as never);
    mockPrisma.workerShare.update.mockResolvedValue({} as never);
  });

  it("saves the exact USD amount with currency=USD (no multiply/divide by rate)", async () => {
    await updateWorkerShareAmount("ws1", "o1", 100, Currency.USD);

    expect(mockPrisma.workerShare.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws1" },
        data: expect.objectContaining({
          sharePercent: null,
          amount: 100, // саме 100, не 100*40 і не 100/40
          currency: Currency.USD,
        }),
      })
    );
  });

  it("leaves currency untouched when not provided", async () => {
    await updateWorkerShareAmount("ws1", "o1", 250);

    const call = mockPrisma.workerShare.update.mock.calls[0][0] as {
      data: Record<string, unknown>;
    };
    expect(call.data.amount).toBe(250);
    expect(call.data.sharePercent).toBeNull();
    expect("currency" in call.data).toBe(false);
  });
});

// ── getPaymentStatus (ext.change #13) ─────────────────────────────────────────
describe("getPaymentStatus", () => {
  it("empty order with no payments", () => {
    expect(getPaymentStatus(0, 0, 0)).toEqual({ kind: "empty" });
  });

  it("advance-only on empty order", () => {
    expect(getPaymentStatus(0, 0, 500)).toEqual({ kind: "advance-only", advance: 500 });
  });

  it("paid + advance on empty (sums correctly)", () => {
    expect(getPaymentStatus(0, 200, 300)).toEqual({ kind: "advance-only", advance: 500 });
  });

  it("owed when nothing paid", () => {
    expect(getPaymentStatus(5000, 0, 0)).toEqual({ kind: "owed", debt: 5000 });
  });

  it("partial payment", () => {
    expect(getPaymentStatus(5000, 2000, 500)).toEqual({ kind: "owed", debt: 2500 });
  });

  it("fully paid via advance only", () => {
    expect(getPaymentStatus(5000, 0, 5000)).toEqual({ kind: "paid" });
  });

  it("fully paid via mix", () => {
    expect(getPaymentStatus(5000, 4000, 1000)).toEqual({ kind: "paid" });
  });

  it("overpayment (change due)", () => {
    expect(getPaymentStatus(5000, 6000, 0)).toEqual({ kind: "overpaid", over: 1000 });
  });

  it("epsilon tolerance for paid", () => {
    expect(getPaymentStatus(5000.005, 5000, 0)).toEqual({ kind: "paid" });
  });
});
