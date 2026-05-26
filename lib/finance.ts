import { prisma } from "./prisma";
import { OrderStatus, Currency } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

// ── Pure helpers (imported for local use) ─────────────────────────────────────
import {
  toN,
  computeOrderTotals,
  type OrderForTotals,
} from "./finance-pure";

// ── Re-export усього клієнт-безпечного з finance-pure ────────────────────────
export type {
  OrderTotals,
  OrderForTotals,
  DebtorRow,
  AggregationCtx,
  WorkerShareForFinance,
  OrderForFinance,
  ClosedPeriodResult,
  ActiveDebtResult,
  PlanFactRow,
  WorkerGroup,
} from "./finance-pure";
export {
  toN,
  toDisplay,
  computeOrderTotals,
  computeOrderDebt,
  aggregateDebtors,
  DREAM_FUND_PERCENT,
  aggregateClosedPeriod,
  aggregateActiveDebt,
  buildPlanFactRows,
  buildWorkerGroups,
} from "./finance-pure";

/** @deprecated Використовуй PlanFactRow з finance-pure */
export type OrderPlanFact = import("./finance-pure").PlanFactRow;

// ── Existing: 5% contribution on order close ─────────────────────────────────

export async function handleOrderClosed(orderId: string): Promise<void> {
  const [order, settings, latestRate] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { works: true, parts: true },
    }),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } }),
  ]);
  if (!order) return;

  const displayCurrency = ((settings as { displayCurrency?: string } | null)?.displayCurrency ?? Currency.UAH) as Currency;
  const fallbackRate = toN(latestRate?.usdToUah) || 41;
  const totals = computeOrderTotals(order as unknown as OrderForTotals, displayCurrency, fallbackRate);
  const contribution = totals.orderTotal * 0.05;
  if (contribution <= 0) return;

  const funds = await prisma.dreamFund.findMany({ orderBy: { createdAt: "asc" } });
  const fund = funds.find((f) => Number(f.currentAmount) < Number(f.targetAmount));
  if (!fund) return;

  await prisma.dreamFund.update({
    where: { id: fund.id },
    data: { currentAmount: { increment: contribution } },
  });
}

// ── Period utilities ──────────────────────────────────────────────────────────

export function getDateRangeForPeriod(
  period: string,
  from?: string,
  to?: string
): { from: Date; to: Date } {
  const now = new Date();
  if (period === "day") return { from: startOfDay(now), to: endOfDay(now) };
  if (period === "week")
    return {
      from: startOfWeek(now, { weekStartsOn: 1 }),
      to: endOfWeek(now, { weekStartsOn: 1 }),
    };
  if (period === "month")
    return { from: startOfMonth(now), to: endOfMonth(now) };
  if (period === "custom" && from && to)
    return { from: new Date(from), to: new Date(to + "T23:59:59") };
  return { from: new Date(0), to: new Date("2099-12-31") };
}
