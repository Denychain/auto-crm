import { prisma } from "./prisma";
import { DREAM_FUND_PERCENT } from "./constants";
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
  toDisplay,
  computeOrderTotals,
  type OrderForTotals,
} from "./finance-pure";

// ── Re-export все клієнт-безпечне з finance-pure ─────────────────────────────
export type {
  OrderTotals,
  OrderForTotals,
  DebtorRow,
} from "./finance-pure";
export {
  toN,
  toDisplay,
  computeOrderTotals,
  computeOrderDebt,
  aggregateDebtors,
} from "./finance-pure";

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
  const contribution = totals.orderTotal * DREAM_FUND_PERCENT;
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

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrderPlanFact {
  id: string;
  client: { name: string };
  vehicle: { plateNumber: string; make: string; model: string };
  planMaterials: number;
  factMaterials: number;
  diff: number;
}

export interface WorkerGroup {
  /** Унікальний ключ: workerId+role або workerName для legacy записів */
  groupKey: string;
  workerName: string;
  /** Мітка ролі (якщо є roleSnapshot) */
  roleLabel: string | null;
  total: number;
  orders: {
    orderId: string;
    vehiclePlate: string;
    clientName: string;
    amount: number;
  }[];
}

export interface FinanceAggregation {
  revenue: number;
  materials: number;
  wages: number;
  netProfit: number;
  debt: number;
  orderPlanFact: OrderPlanFact[];
  workerGroups: WorkerGroup[];
}

// ── Main aggregation ──────────────────────────────────────────────────────────

export async function aggregateFinanceData(
  range: { from: Date; to: Date },
  displayCurrency: Currency = Currency.UAH
): Promise<FinanceAggregation> {
  const latestRate = await prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });
  const fallbackRate = toN(latestRate?.usdToUah) || 41;

  const [closedOrders, activeOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        status: OrderStatus.CLOSED,
        updatedAt: { gte: range.from, lte: range.to },
      },
      include: {
        client: { select: { name: true } },
        vehicle: { select: { plateNumber: true, make: true, model: true } },
        works: true,
        parts: true,
        workerShares: true,
      },
    }),
    prisma.order.findMany({
      where: { status: { not: OrderStatus.CLOSED } },
      include: { works: true, parts: true },
    }),
  ]);

  const revenue = closedOrders.reduce((sum, o) => {
    return sum + computeOrderTotals(o as unknown as OrderForTotals, displayCurrency, fallbackRate).orderTotal;
  }, 0);

  const materials = closedOrders.reduce((sum, o) => {
    return (
      sum +
      o.parts.reduce((s, p) => {
        const partCurrency = (p as { currency?: Currency }).currency ?? Currency.UAH;
        const partRate = toN((p as { exchangeRate?: unknown }).exchangeRate) || fallbackRate;
        const v = p.actualPrice != null ? toN(p.actualPrice) : toN(p.estimatedPrice);
        return s + toDisplay(v, partCurrency, partRate, displayCurrency, fallbackRate);
      }, 0)
    );
  }, 0);

  const wages = closedOrders.reduce((sum, o) => {
    return (
      sum +
      o.workerShares.reduce((s, ws) => {
        const wsCurrency = (ws as { currency?: Currency }).currency ?? Currency.UAH;
        const wsRate = toN((ws as { exchangeRate?: unknown }).exchangeRate) || fallbackRate;
        return s + toDisplay(toN(ws.amount), wsCurrency, wsRate, displayCurrency, fallbackRate);
      }, 0)
    );
  }, 0);

  const debt = activeOrders.reduce((sum, o) => {
    const outstanding = computeOrderTotals(o as unknown as OrderForTotals, displayCurrency, fallbackRate).outstanding;
    return sum + (outstanding > 0.01 ? outstanding : 0);
  }, 0);

  const orderPlanFact: OrderPlanFact[] = closedOrders
    .map((o) => {
      const plan = o.parts.reduce((s, p) => s + toN(p.estimatedPrice), 0);
      const fact = o.parts.reduce(
        (s, p) =>
          s + (p.actualPrice != null ? toN(p.actualPrice) : toN(p.estimatedPrice)),
        0
      );
      return {
        id: o.id,
        client: o.client,
        vehicle: o.vehicle,
        planMaterials: plan,
        factMaterials: fact,
        diff: fact - plan,
      };
    })
    .sort((a, b) => b.diff - a.diff);

  const ROLE_LABELS: Record<string, string> = {
    PREP: "Підготовщик",
    PAINTER: "Маляр",
    POLISHER: "Полірувальник",
    OWNER: "Власник",
    OTHER: "Інше",
  };

  const workerMap = new Map<string, WorkerGroup>();
  for (const o of closedOrders) {
    for (const ws of o.workerShares) {
      const role = (ws as { roleSnapshot?: string | null }).roleSnapshot;
      const workerId = (ws as { workerId?: string | null }).workerId;
      const groupKey = workerId && role
        ? `${workerId}::${role}`
        : ws.workerName;

      if (!workerMap.has(groupKey)) {
        workerMap.set(groupKey, {
          groupKey,
          workerName: ws.workerName,
          roleLabel: role ? (ROLE_LABELS[role] ?? role) : null,
          total: 0,
          orders: [],
        });
      }
      const group = workerMap.get(groupKey)!;
      group.total += toN(ws.amount);
      group.orders.push({
        orderId: o.id,
        vehiclePlate: o.vehicle.plateNumber,
        clientName: o.client.name,
        amount: toN(ws.amount),
      });
    }
  }
  const workerGroups = [...workerMap.values()].sort((a, b) => b.total - a.total);

  return {
    revenue,
    materials,
    wages,
    netProfit: revenue - materials - wages,
    debt,
    orderPlanFact,
    workerGroups,
  };
}
