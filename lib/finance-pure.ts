/**
 * Чисті фінансові функції без жодного серверного/Prisma імпорту.
 * Безпечно імпортувати з клієнтських компонентів ("use client").
 *
 * Серверні агрегати (handleOrderClosed, aggregateFinanceData) лишаються в lib/finance.ts.
 */
import { Currency } from "@prisma/client";
import { normalizeToUSD } from "./currency";

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

type DebtorOrder = OrderForTotals & {
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
