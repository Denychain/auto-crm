import "@testing-library/jest-dom";
import { vi } from "vitest";

// ── Mock next/navigation ───────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

// ── Mock next/cache ────────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// ── Mock global fetch (НБУ API → fake rate 41.5) ─────────────────────────────
const MOCK_NBU_RATE = 41.5;
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => [{ rate: MOCK_NBU_RATE, exchangedate: "01.01.2025" }],
}) as unknown as typeof fetch;

// ── Mock Prisma ────────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    orderWork: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    orderPart: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    workerShare: {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    worker: { findUnique: vi.fn(), findMany: vi.fn() },
    shareTemplate: { findUnique: vi.fn() },
    dreamFund: { findMany: vi.fn(), update: vi.fn() },
    exchangeRate: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    settings: { findUnique: vi.fn() },
    $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn({})),
  },
}));
