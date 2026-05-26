import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { differenceInDays } from "date-fns";
import { OrderStatus } from "@prisma/client";
import { IDLE_THRESHOLD_DAYS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DecimalLike = { toNumber(): number } | number | string | null | undefined;

function toNumber(val: DecimalLike): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

type WorkLike = { price: DecimalLike };
type PartLike = { estimatedPrice: DecimalLike; actualPrice: DecimalLike };

/**
 * @deprecated Валютно-наївна функція — складає числа без конверсії.
 * Використовуйте `computeOrderTotals` з `lib/finance.ts` замість неї.
 * Лишається для зворотньої сумісності в нефінансових контекстах (dashboard, клієнти).
 */
export function calcOrderTotal(works: WorkLike[], parts: PartLike[]): number {
  const worksTotal = works.reduce((sum, w) => sum + toNumber(w.price), 0);
  const partsTotal = parts.reduce(
    (sum, p) =>
      sum + (p.actualPrice != null ? toNumber(p.actualPrice) : toNumber(p.estimatedPrice)),
    0
  );
  return worksTotal + partsTotal;
}

type OrderLike = {
  estimatedPrice: DecimalLike;
  advancePayment: DecimalLike;
  totalPaid: DecimalLike;
  works: WorkLike[];
  parts: PartLike[];
};

/**
 * @deprecated Валютно-наївна функція.
 * Використовуйте `computeOrderTotals(...).outstanding` з `lib/finance.ts` замість неї.
 */
export function calcDebt(order: OrderLike): number {
  const total = calcOrderTotal(order.works, order.parts);
  return total - toNumber(order.totalPaid) - toNumber(order.advancePayment);
}

export function calcIdleDays(readyDate: Date | null | undefined): number {
  if (!readyDate) return 0;
  return differenceInDays(new Date(), readyDate);
}

export function isOverdue(order: {
  status: OrderStatus;
  readyDate: Date | null | undefined;
}): boolean {
  return (
    order.status === OrderStatus.DONE &&
    calcIdleDays(order.readyDate) > IDLE_THRESHOLD_DAYS
  );
}

export function formatPlate(plate: string): string {
  const n = plate.replace(/\s+/g, "").toUpperCase();
  const m = n.match(/^([A-Z]{2})(\d{3,4})([A-Z]{2})$/);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : n;
}
