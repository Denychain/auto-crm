import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkerRole, Currency } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";

// requireAuth тягне next-auth (@/auth) — мокаємо, щоб імпорт server action не
// падав на резолві next/server у jsdom-середовищі.
vi.mock("@/lib/auth", () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: "u1", name: "Test" }),
  getCurrentUser: vi.fn().mockResolvedValue({ id: "u1", name: "Test" }),
}));

import { applyShareTemplate } from "@/app/(crm)/orders/[id]/actions";

const mockPrisma = vi.mocked(prisma);

// ── Pure share-calculation helpers (extracted logic) ──────────────────────────
// These test the math that backs applyShareTemplate server action

function calcShareAmount(base: number, percent: number): number {
  return (base * percent) / 100;
}

function calcBase(orderTotal: number, partsTotal: number): number {
  return orderTotal - partsTotal;
}

function validateDistribution(shares: { amount: number }[], base: number) {
  const distributed = shares.reduce((s, sh) => s + sh.amount, 0);
  const diff = distributed - base;
  return {
    distributed,
    isBalanced: Math.abs(diff) <= 0.01,
    isOver: diff > 0.01,
    isUnder: diff < -0.01,
    diff,
  };
}

// ── applyShareTemplate server action ──────────────────────────────────────────
describe("applyShareTemplate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // applyShareTemplate викликає getCurrentRate() → читає кешований курс із БД
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({ usdToUah: new Decimal(40) } as never);
  });

  const mockOrder = {
    id: "order-1",
    works: [{ price: 10000 }],
    parts: [{ estimatedPrice: 0, actualPrice: null }],
    workerShares: [],
  };

  const mockTemplate = {
    id: "tpl-standard",
    rules: [
      { id: "r1", role: WorkerRole.PREP, percent: 30 },
      { id: "r2", role: WorkerRole.PAINTER, percent: 30 },
      { id: "r3", role: WorkerRole.OWNER, percent: 40 },
    ],
  };

  it("returns all roles as needWorkers when order has no shares", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(mockOrder as never);
    mockPrisma.shareTemplate.findUnique.mockResolvedValue(mockTemplate as never);

    const result = await applyShareTemplate("order-1", "tpl-standard");

    expect(result.needWorkers).toContain(WorkerRole.PREP);
    expect(result.needWorkers).toContain(WorkerRole.PAINTER);
    expect(result.needWorkers).toContain(WorkerRole.OWNER);
    expect(result.needWorkers).toHaveLength(3);
  });

  it("updates % for existing role, returns needWorkers for missing ones", async () => {
    const orderWithExistingShare = {
      ...mockOrder,
      workerShares: [
        {
          id: "ws-1",
          workerName: "Ілля",
          workerId: "w-1",
          roleSnapshot: WorkerRole.PREP,
          sharePercent: 25,
          amount: 2500,
        },
      ],
    };

    mockPrisma.order.findUnique.mockResolvedValue(orderWithExistingShare as never);
    mockPrisma.shareTemplate.findUnique.mockResolvedValue(mockTemplate as never);
    mockPrisma.workerShare.update.mockResolvedValue({} as never);

    const result = await applyShareTemplate("order-1", "tpl-standard");

    expect(result.needWorkers).not.toContain(WorkerRole.PREP);
    expect(result.needWorkers).toContain(WorkerRole.PAINTER);
    expect(result.needWorkers).toContain(WorkerRole.OWNER);

    expect(mockPrisma.workerShare.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ws-1" },
        data: expect.objectContaining({ sharePercent: 30 }),
      })
    );
  });

  it("does NOT delete existing workerShares", async () => {
    const orderWithShares = {
      ...mockOrder,
      workerShares: [
        { id: "ws-1", workerName: "Ілля", roleSnapshot: WorkerRole.PREP, sharePercent: 25, amount: 2500 },
      ],
    };
    mockPrisma.order.findUnique.mockResolvedValue(orderWithShares as never);
    mockPrisma.shareTemplate.findUnique.mockResolvedValue(mockTemplate as never);
    mockPrisma.workerShare.update.mockResolvedValue({} as never);

    await applyShareTemplate("order-1", "tpl-standard");
    expect(mockPrisma.workerShare.deleteMany).not.toHaveBeenCalled();
  });

  it("returns empty needWorkers if all roles are covered", async () => {
    const fullOrder = {
      ...mockOrder,
      workerShares: [
        { id: "ws-1", workerName: "Ілля", roleSnapshot: WorkerRole.PREP, sharePercent: 30, amount: 3000 },
        { id: "ws-2", workerName: "Тато", roleSnapshot: WorkerRole.PAINTER, sharePercent: 30, amount: 3000 },
        { id: "ws-3", workerName: "Тато", roleSnapshot: WorkerRole.OWNER, sharePercent: 40, amount: 4000 },
      ],
    };
    mockPrisma.order.findUnique.mockResolvedValue(fullOrder as never);
    mockPrisma.shareTemplate.findUnique.mockResolvedValue(mockTemplate as never);
    mockPrisma.workerShare.update.mockResolvedValue({} as never);

    const result = await applyShareTemplate("order-1", "tpl-standard");
    expect(result.needWorkers).toHaveLength(0);
  });

  it("returns empty if order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    mockPrisma.shareTemplate.findUnique.mockResolvedValue(mockTemplate as never);

    const result = await applyShareTemplate("nonexistent", "tpl-1");
    expect(result.needWorkers).toHaveLength(0);
  });
});

// ── Pure math helpers ─────────────────────────────────────────────────────────
describe("share calculation math", () => {
  it("30% of 10000 remainder = 3000", () => {
    expect(calcShareAmount(10000, 30)).toBe(3000);
  });

  it("40% of 8500 remainder = 3400", () => {
    expect(calcShareAmount(8500, 40)).toBe(3400);
  });

  it("base = total - parts", () => {
    expect(calcBase(12000, 2000)).toBe(10000);
  });

  it("100% distribution is balanced", () => {
    const shares = [
      { amount: 3000 },
      { amount: 3000 },
      { amount: 4000 },
    ];
    const result = validateDistribution(shares, 10000);
    expect(result.isBalanced).toBe(true);
    expect(result.distributed).toBe(10000);
  });

  it("over-distribution detected", () => {
    const shares = [{ amount: 6000 }, { amount: 6000 }];
    const result = validateDistribution(shares, 10000);
    expect(result.isOver).toBe(true);
    expect(result.diff).toBe(2000);
  });

  it("under-distribution detected", () => {
    const shares = [{ amount: 3000 }];
    const result = validateDistribution(shares, 10000);
    expect(result.isUnder).toBe(true);
    expect(result.diff).toBe(-7000);
  });

  it("recalculates correctly when total changes", () => {
    const BASE_PERCENT = 30;
    const newBase = 15000;
    expect(calcShareAmount(newBase, BASE_PERCENT)).toBe(4500);
  });
});

// ── messenger links ───────────────────────────────────────────────────────────
describe("messenger", () => {
  it("builds viber link correctly", async () => {
    const { viberLink } = await import("@/lib/messenger");
    const link = viberLink("+380671234567", "Привіт!");
    expect(link).toContain("viber://chat");
    expect(link).toContain("380671234567");
    expect(link).toContain(encodeURIComponent("Привіт!"));
  });

  it("builds telegram share link", async () => {
    const { telegramLink } = await import("@/lib/messenger");
    const link = telegramLink("Test message");
    expect(link).toContain("t.me/share");
    expect(link).toContain(encodeURIComponent("Test message"));
  });

  it("builds SMS link", async () => {
    const { smsLink } = await import("@/lib/messenger");
    const link = smsLink("+380671234567", "Test");
    expect(link).toContain("sms:");
    expect(link).toContain("+380671234567");
  });

  it("ready-to-pickup template contains client name", async () => {
    const { tplReadyToPickup } = await import("@/lib/messenger");
    const msg = tplReadyToPickup("Іван");
    expect(msg).toContain("Іван");
    expect(msg).toContain("готове");
  });
});
