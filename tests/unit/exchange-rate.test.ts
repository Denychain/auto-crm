import { describe, it, expect, vi, beforeEach } from "vitest";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getCachedRate, fetchRateFromNBU } from "@/lib/exchange-rate";

const mockPrisma = vi.mocked(prisma);

describe("exchange-rate", () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [{ rate: 41.5, exchangedate: "01.01.2025" }],
    } as Response);
  });

  it("returns cached rate from DB when available", async () => {
    const cachedDecimal = new Decimal(42.0);
    mockPrisma.exchangeRate.findUnique.mockResolvedValue({
      date: new Date(),
      usdToUah: cachedDecimal,
      source: "NBU",
    } as never);

    const rate = await getCachedRate();

    expect(rate.toNumber()).toBe(42.0);
    expect(global.fetch).not.toHaveBeenCalled(); // no network call needed
  });

  it("fetches from NBU when no cached rate", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    mockPrisma.exchangeRate.upsert.mockResolvedValue({
      usdToUah: new Decimal(41.5),
    } as never);

    const rate = await getCachedRate();

    expect(global.fetch).toHaveBeenCalledOnce();
    expect(rate.toNumber()).toBe(41.5);
  });

  it("falls back to latest stored rate if NBU API fails", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      usdToUah: new Decimal(40.0),
    } as never);

    const rate = await getCachedRate();

    expect(rate.toNumber()).toBe(40.0);
  });

  it("falls back to 41.0 if NBU fails AND no stored rate", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));
    mockPrisma.exchangeRate.findFirst.mockResolvedValue(null);

    const rate = await getCachedRate();

    expect(rate.toNumber()).toBe(41.0);
  });

  it("falls back when NBU returns empty array", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [],
    } as never);
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      usdToUah: new Decimal(39.5),
    } as never);

    const rate = await getCachedRate();

    expect(rate.toNumber()).toBe(39.5);
  });

  it("falls back when NBU returns non-ok status", async () => {
    mockPrisma.exchangeRate.findUnique.mockResolvedValue(null);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => [],
    } as never);
    mockPrisma.exchangeRate.findFirst.mockResolvedValue({
      usdToUah: new Decimal(38.0),
    } as never);

    const rate = await getCachedRate();

    expect(rate.toNumber()).toBe(38.0);
  });

  it("fetchRateFromNBU parses NBU response correctly", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => [{ rate: 41.75, exchangedate: "15.01.2025" }],
    } as Response);

    const result = await fetchRateFromNBU(new Date("2025-01-15"));

    expect(result).not.toBeNull();
    expect(result!.rate).toBe(41.75);
  });
});
