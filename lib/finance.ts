import { prisma } from "./prisma";
import { calcOrderTotal } from "./utils";
import { DREAM_FUND_PERCENT } from "./constants";
import { OrderStatus } from "@prisma/client";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";

// ── Existing: 5% contribution on order close ─────────────────────────────────

export async function handleOrderClosed(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { works: true, parts: true },
  });
  if (!order) return;

  const total = calcOrderTotal(order.works, order.parts);
  const contribution = total * DREAM_FUND_PERCENT;
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
  workerName: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function toN(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

// ── Main aggregation ──────────────────────────────────────────────────────────

export async function aggregateFinanceData(
  range: { from: Date; to: Date }
): Promise<FinanceAggregation> {
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

  const revenue = closedOrders.reduce(
    (sum, o) => sum + calcOrderTotal(o.works, o.parts),
    0
  );

  const materials = closedOrders.reduce((sum, o) => {
    return (
      sum +
      o.parts.reduce(
        (s, p) =>
          s + (p.actualPrice != null ? toN(p.actualPrice) : toN(p.estimatedPrice)),
        0
      )
    );
  }, 0);

  const wages = closedOrders.reduce((sum, o) => {
    return sum + o.workerShares.reduce((s, ws) => s + toN(ws.amount), 0);
  }, 0);

  const debt = activeOrders.reduce((sum, o) => {
    const total = calcOrderTotal(o.works, o.parts);
    const paid = toN(o.totalPaid) + toN(o.advancePayment);
    const d = total - paid;
    return sum + (d > 0.01 ? d : 0);
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

  const workerMap = new Map<string, WorkerGroup>();
  for (const o of closedOrders) {
    for (const ws of o.workerShares) {
      if (!workerMap.has(ws.workerName)) {
        workerMap.set(ws.workerName, { workerName: ws.workerName, total: 0, orders: [] });
      }
      const group = workerMap.get(ws.workerName)!;
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
