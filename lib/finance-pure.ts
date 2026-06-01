/**
 * Чисті фінансові функції без жодного серверного/Prisma імпорту.
 * Безпечно імпортувати з клієнтських компонентів ("use client").
 *
 * Серверні агрегати (handleOrderClosed) лишаються в lib/finance.ts.
 * Агрегаційні функції (aggregateClosedPeriod, aggregateActiveDebt,
 * buildPlanFactRows, buildWorkerGroups) — тут, щоб їх можна тестувати без Prisma.
 */
import { Currency } from "@prisma/client";
import { normalizeToUSD } from "./currency";

export const DREAM_FUND_PERCENT = 0.05;

// ── Low-level helpers ──────────────────────────────────────────────────────────

/** Нормалізує Decimal-like або звичайне число до number. */
export function toN(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

/**
 * Нормалізує суму до валюти відображення через per-record exchangeRate.
 * Якщо exchangeRate відсутній — використовує fallbackRate.
 */
export function toDisplay(
  amount: unknown,
  recordCurrency: Currency | string,
  exchangeRate: unknown,
  displayCurrency: Currency,
  fallbackRate: number
): number {
  const n = toN(amount);
  const rate = toN(exchangeRate) || fallbackRate;
  const src = recordCurrency as Currency;

  if (src === displayCurrency) return n;
  if (src === Currency.UAH && displayCurrency === Currency.USD) return n / rate;
  if (src === Currency.USD && displayCurrency === Currency.UAH) return n * rate;
  return normalizeToUSD(n, src, rate);
}

// ── OrderTotals — єдиний обчислювальний конвеєр ───────────────────────────────

export interface OrderTotals {
  /** Сума робіт у валюті відображення */
  worksTotal: number;
  /** Сума запчастин (план) у валюті відображення */
  partsEstimatedTotal: number;
  /** Сума запчастин (факт або план) у валюті відображення */
  partsActualTotal: number;
  /** Загальна сума = worksTotal + partsActualTotal */
  orderTotal: number;
  /** Завдаток у валюті відображення */
  advance: number;
  /** Вже оплачено у валюті відображення */
  paid: number;
  /** До оплати = max(0, orderTotal − advance − paid) */
  outstanding: number;
  /** Залишок на людей = worksTotal (матеріали — pass-through) */
  poolForPeople: number;
  /** Вже розподілено між майстрами */
  allocatedToWorkers: number;
  /** Залишок власника = poolForPeople − allocatedToWorkers */
  ownerRemainder: number;
  /** true якщо розподілено більше ніж poolForPeople */
  overAllocated: boolean;
}

/** Структурний тип-параметр для computeOrderTotals — широкий, щоб приймати як
 *  Prisma-результати (Decimal), так і серіалізовані значення (number/string). */
export interface OrderForTotals {
  currency?: string;
  baseExchangeRate?: unknown;
  advancePayment?: unknown;
  totalPaid?: unknown;
  works: Array<{ price: unknown; currency?: string; exchangeRate?: unknown }>;
  parts: Array<{ estimatedPrice: unknown; actualPrice?: unknown; currency?: string; exchangeRate?: unknown }>;
  workerShares?: Array<{ amount: unknown; currency?: string; exchangeRate?: unknown }>;
}

/**
 * Централізований обчислювальний конвеєр.
 * Усі суми нормалізуються до displayCurrency через per-record exchangeRate.
 * Жодна функція UI не повинна рахувати фінанси самостійно.
 */
export function computeOrderTotals(
  order: OrderForTotals,
  displayCurrency: Currency,
  fallbackRate: number,
): OrderTotals {
  const worksTotal = order.works.reduce((sum, w) => {
    const c = (w.currency as Currency) ?? Currency.UAH;
    return sum + toDisplay(w.price, c, w.exchangeRate, displayCurrency, fallbackRate);
  }, 0);

  const partsEstimatedTotal = order.parts.reduce((sum, p) => {
    const c = (p.currency as Currency) ?? Currency.UAH;
    return sum + toDisplay(p.estimatedPrice, c, p.exchangeRate, displayCurrency, fallbackRate);
  }, 0);

  const partsActualTotal = order.parts.reduce((sum, p) => {
    const c = (p.currency as Currency) ?? Currency.UAH;
    const v = p.actualPrice != null ? p.actualPrice : p.estimatedPrice;
    return sum + toDisplay(v, c, p.exchangeRate, displayCurrency, fallbackRate);
  }, 0);

  const orderTotal = worksTotal + partsActualTotal;

  // Завдаток і сплачено зберігаються в основній валюті замовлення
  const orderCurrency = (order.currency as Currency) ?? Currency.UAH;
  const orderRate = order.baseExchangeRate;
  const advance = toDisplay(order.advancePayment ?? 0, orderCurrency, orderRate, displayCurrency, fallbackRate);
  const paid = toDisplay(order.totalPaid ?? 0, orderCurrency, orderRate, displayCurrency, fallbackRate);
  const outstanding = Math.max(0, orderTotal - advance - paid);

  const poolForPeople = worksTotal;

  const allocatedToWorkers = (order.workerShares ?? []).reduce((sum, ws) => {
    const c = (ws.currency as Currency) ?? Currency.UAH;
    return sum + toDisplay(ws.amount, c, ws.exchangeRate, displayCurrency, fallbackRate);
  }, 0);

  const ownerRemainder = poolForPeople - allocatedToWorkers;
  const overAllocated = allocatedToWorkers > poolForPeople + 0.01;

  return {
    worksTotal,
    partsEstimatedTotal,
    partsActualTotal,
    orderTotal,
    advance,
    paid,
    outstanding,
    poolForPeople,
    allocatedToWorkers,
    ownerRemainder,
    overAllocated,
  };
}

// ── Статус оплати замовлення ───────────────────────────────────────────────────

export type PaymentStatus =
  | { kind: "empty" }
  | { kind: "advance-only"; advance: number }
  | { kind: "owed"; debt: number }
  | { kind: "paid" }
  | { kind: "overpaid"; over: number };

/**
 * Визначає, в якому стані оплати знаходиться замовлення.
 * Усі суми в одній валюті (як правило, displayCurrency).
 *
 * - empty:        замовлення ще не заповнене (немає робіт і запчастин)
 * - advance-only: нічого не вписано, але є завдаток
 * - owed:         є сума замовлення, не сплачено повністю
 * - paid:         сума замовлення повністю покрита (paid + advance)
 * - overpaid:     внесено більше за суму замовлення (потенційна здача)
 */
export function getPaymentStatus(
  orderTotal: number,
  paid: number,
  advance: number
): PaymentStatus {
  const EPSILON = 0.01;
  const sum = (paid || 0) + (advance || 0);

  if (orderTotal < EPSILON) {
    if (sum > EPSILON) return { kind: "advance-only", advance: sum };
    return { kind: "empty" };
  }

  if (sum < EPSILON) return { kind: "owed", debt: orderTotal };
  if (sum > orderTotal + EPSILON) return { kind: "overpaid", over: sum - orderTotal };
  if (sum >= orderTotal - EPSILON) return { kind: "paid" };
  return { kind: "owed", debt: orderTotal - sum };
}

// ── Борг і агрегати ────────────────────────────────────────────────────────────

export interface DebtorRow {
  orderId: string;
  /** Борг у валюті відображення */
  debt: number;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

/**
 * Обчислює борг одного замовлення у двох валютах.
 * - debtInOrderCurrency: борг у власній валюті замовлення (для reference)
 * - debtInDisplayCurrency: борг у валюті відображення (для UI)
 */
export function computeOrderDebt(
  order: OrderForTotals,
  displayCurrency: Currency,
  fallbackRate: number,
): {
  debtInOrderCurrency: number;
  debtInDisplayCurrency: number;
  orderCurrency: Currency;
  isPaid: boolean;
} {
  const orderCurrency = (order.currency as Currency) ?? Currency.UAH;
  // Борг у власній валюті замовлення
  const totalsInOrderCurrency = computeOrderTotals(order, orderCurrency, fallbackRate);
  const debtInOrderCurrency = totalsInOrderCurrency.outstanding;
  // Борг у валюті відображення
  const totalsInDisplayCurrency = computeOrderTotals(order, displayCurrency, fallbackRate);
  const debtInDisplayCurrency = totalsInDisplayCurrency.outstanding;
  return {
    debtInOrderCurrency,
    debtInDisplayCurrency,
    orderCurrency,
    isPaid: debtInDisplayCurrency <= 0.01,
  };
}

export type DebtorOrder = OrderForTotals & {
  id: string;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
};

/**
 * Агрегує борги по всіх замовленнях у displayCurrency.
 * Повертає відсортований список боржників і загальний борг.
 * Правильно конвертує кожне замовлення перед агрегацією (не сумує raw числа).
 */
export function aggregateDebtors(
  orders: DebtorOrder[],
  displayCurrency: Currency,
  fallbackRate: number,
): { debtors: DebtorRow[]; totalDebt: number } {
  const debtors: DebtorRow[] = [];
  let totalDebt = 0;

  for (const order of orders) {
    const { debtInDisplayCurrency } = computeOrderDebt(order, displayCurrency, fallbackRate);
    if (debtInDisplayCurrency > 0.01) {
      debtors.push({
        orderId: order.id,
        debt: debtInDisplayCurrency,
        client: order.client,
        vehicle: order.vehicle,
      });
      totalDebt += debtInDisplayCurrency;
    }
  }

  debtors.sort((a, b) => b.debt - a.debt);
  return { debtors, totalDebt };
}

// ── Агрегаційні функції (чисті, без Prisma) ────────────────────────────────────

/** Спільний контекст валюти та курсу для всіх агрегацій */
export interface AggregationCtx {
  displayCurrency: Currency;
  /** Поточний курс USD→UAH (для активних боргів) */
  fallbackRate: number;
}

/** Тип WorkerShare для фінансових агрегатів */
export interface WorkerShareForFinance {
  amount: unknown;
  currency?: string;
  exchangeRate?: unknown;
  roleSnapshot?: string | null;
  workerId?: string | null;
  workerName: string;
}

/** Тип замовлення для фінансових агрегатів (розширює OrderForTotals) */
export interface OrderForFinance extends OrderForTotals {
  id: string;
  status?: string;
  client: { name: string; phone?: string };
  vehicle: { plateNumber: string; make: string; model: string };
  workerShares: WorkerShareForFinance[];
}

/** Результат агрегації закритих замовлень за період */
export interface ClosedPeriodResult {
  revenue: number;
  materials: number;
  /** Виплати майстрам (role ≠ OWNER) */
  wagesMasters: number;
  /** Заробіток власника (role = OWNER) */
  wagesOwner: number;
  /** 5% від виручки → DreamFund */
  dreamFundContribution: number;
  /** Контрольна сума: має бути ~0 при правильному розподілі */
  unallocated: number;
}

/** Результат агрегації активних боргів */
export interface ActiveDebtResult {
  totalDebt: number;
  debtorsCount: number;
}

/** Рядок план/факт для таблиці матеріалів */
export interface PlanFactRow {
  id: string;
  client: { name: string };
  vehicle: { plateNumber: string; make: string; model: string };
  planMaterials: number;
  factMaterials: number;
  diff: number;
}

/** Група виплат одного майстра */
export interface WorkerGroup {
  /** Унікальний ключ: workerId+role або workerName для legacy записів */
  groupKey: string;
  workerName: string;
  /** Мітка ролі (якщо є roleSnapshot) */
  roleLabel: string | null;
  /** true якщо role = OWNER */
  isOwner: boolean;
  total: number;
  orders: {
    orderId: string;
    vehiclePlate: string;
    clientName: string;
    amount: number;
  }[];
}

const ROLE_LABELS: Record<string, string> = {
  PREP: "Підготовщик",
  PAINTER: "Маляр",
  POLISHER: "Полірувальник",
  OWNER: "Власник",
  OTHER: "Інше",
};

/**
 * Агрегує фінансові метрики по закритих замовленнях за період.
 * Усі суми нормалізуються до ctx.displayCurrency через per-record exchangeRate.
 */
export function aggregateClosedPeriod(
  closedOrders: OrderForFinance[],
  ctx: AggregationCtx,
): ClosedPeriodResult {
  const { displayCurrency, fallbackRate } = ctx;
  let revenue = 0;
  let materials = 0;
  let wagesMasters = 0;
  let wagesOwner = 0;

  for (const o of closedOrders) {
    revenue += computeOrderTotals(o, displayCurrency, fallbackRate).orderTotal;

    for (const p of o.parts) {
      const c = (p.currency as Currency) ?? Currency.UAH;
      const v = p.actualPrice != null ? p.actualPrice : p.estimatedPrice;
      materials += toDisplay(v, c, p.exchangeRate, displayCurrency, fallbackRate);
    }

    for (const ws of o.workerShares) {
      const c = (ws.currency as Currency) ?? Currency.UAH;
      const amt = toDisplay(ws.amount, c, ws.exchangeRate, displayCurrency, fallbackRate);
      if (ws.roleSnapshot === "OWNER") {
        wagesOwner += amt;
      } else {
        wagesMasters += amt;
      }
    }
  }

  const dreamFundContribution = revenue * DREAM_FUND_PERCENT;
  const unallocated = revenue - materials - wagesMasters - wagesOwner - dreamFundContribution;

  return { revenue, materials, wagesMasters, wagesOwner, dreamFundContribution, unallocated };
}

/**
 * Агрегує активну заборгованість (без POSTPONED-замовлень).
 * Використовує поточний курс (fallbackRate) — борг це майбутнє надходження.
 */
export function aggregateActiveDebt(
  activeOrders: Array<OrderForTotals & { status?: string }>,
  ctx: AggregationCtx,
): ActiveDebtResult {
  const { displayCurrency, fallbackRate } = ctx;
  let totalDebt = 0;
  let debtorsCount = 0;

  for (const o of activeOrders) {
    // Захист: POSTPONED не рахуємо у борг
    if ((o.status as string) === "POSTPONED") continue;
    const outstanding = computeOrderTotals(o, displayCurrency, fallbackRate).outstanding;
    if (outstanding > 0.01) {
      totalDebt += outstanding;
      debtorsCount++;
    }
  }

  return { totalDebt, debtorsCount };
}

/**
 * Будує рядки план/факт по матеріалах для кожного закритого замовлення.
 * Конвертує per-part через toDisplay (FIN-05 fix).
 */
export function buildPlanFactRows(
  closedOrders: OrderForFinance[],
  ctx: AggregationCtx,
): PlanFactRow[] {
  const { displayCurrency, fallbackRate } = ctx;
  return closedOrders
    .map((o) => {
      const planMaterials = o.parts.reduce((s, p) => {
        const c = (p.currency as Currency) ?? Currency.UAH;
        return s + toDisplay(p.estimatedPrice, c, p.exchangeRate, displayCurrency, fallbackRate);
      }, 0);
      const factMaterials = o.parts.reduce((s, p) => {
        const c = (p.currency as Currency) ?? Currency.UAH;
        const v = p.actualPrice != null ? p.actualPrice : p.estimatedPrice;
        return s + toDisplay(v, c, p.exchangeRate, displayCurrency, fallbackRate);
      }, 0);
      return {
        id: o.id,
        client: { name: o.client.name },
        vehicle: o.vehicle,
        planMaterials,
        factMaterials,
        diff: factMaterials - planMaterials,
      };
    })
    .sort((a, b) => b.diff - a.diff);
}

/**
 * Групує виплати по майстрах. Суми нормалізовані до ctx.displayCurrency.
 * isOwner = true для role = OWNER (FIN-09 fix).
 */
export function buildWorkerGroups(
  closedOrders: OrderForFinance[],
  ctx: AggregationCtx,
): WorkerGroup[] {
  const { displayCurrency, fallbackRate } = ctx;
  const workerMap = new Map<string, WorkerGroup>();

  for (const o of closedOrders) {
    for (const ws of o.workerShares) {
      const role = ws.roleSnapshot;
      const workerId = ws.workerId;
      const groupKey = workerId && role ? `${workerId}::${role}` : ws.workerName;

      if (!workerMap.has(groupKey)) {
        workerMap.set(groupKey, {
          groupKey,
          workerName: ws.workerName,
          roleLabel: role ? (ROLE_LABELS[role] ?? role) : null,
          isOwner: role === "OWNER",
          total: 0,
          orders: [],
        });
      }
      const group = workerMap.get(groupKey)!;
      const c = (ws.currency as Currency) ?? Currency.UAH;
      const amt = toDisplay(ws.amount, c, ws.exchangeRate, displayCurrency, fallbackRate);
      group.total += amt;
      group.orders.push({
        orderId: o.id,
        vehiclePlate: o.vehicle.plateNumber,
        clientName: o.client.name,
        amount: amt,
      });
    }
  }

  return [...workerMap.values()].sort((a, b) => b.total - a.total);
}
