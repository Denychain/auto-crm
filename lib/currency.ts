import { Currency } from "@prisma/client";

export type { Currency };

type DecimalLike = { toNumber(): number } | number | string | null | undefined;

function toNum(v: DecimalLike): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}

export interface Money {
  amount: DecimalLike;
  currency: Currency;
  exchangeRate?: DecimalLike; // UAH per 1 USD at time of transaction
}

/** Convert amount to target currency using the given rate (UAH per 1 USD). */
export function convert(
  money: Money,
  toCurrency: Currency,
  rate?: DecimalLike
): number {
  const amount = toNum(money.amount);
  const r = toNum(rate ?? money.exchangeRate) || 41;

  if (money.currency === toCurrency) return amount;
  if (money.currency === Currency.USD && toCurrency === Currency.UAH) return amount * r;
  if (money.currency === Currency.UAH && toCurrency === Currency.USD) return amount / r;
  return amount;
}

/** Normalize any amount to USD (as a common base for aggregation). */
export function normalizeToUSD(
  amount: DecimalLike,
  currency: Currency,
  rate: DecimalLike
): number {
  const a = toNum(amount);
  const r = toNum(rate) || 41;
  if (currency === Currency.USD) return a;
  return a / r;
}

/** Format money for display. */
export function formatMoney(
  amount: DecimalLike,
  currency: Currency = Currency.UAH
): string {
  const num = toNum(amount);
  const rounded = Math.round(num * 100) / 100;

  if (currency === Currency.USD) {
    const [int, dec] = rounded.toFixed(2).split(".");
    const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const cents = dec === "00" ? "" : `.${dec}`;
    return `$${formatted}${cents}`;
  }

  // UAH — Ukrainian style: spaces as thousands separator, ₴ suffix
  const [int, dec] = rounded.toFixed(2).split(".");
  const formatted = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const cents = dec === "00" ? "" : `,${dec}`;
  return `${formatted}${cents} ₴`;
}

/** Compact format: $1.2k or 1,2k₴ */
export function formatMoneyShort(
  amount: DecimalLike,
  currency: Currency = Currency.UAH
): string {
  const num = toNum(amount);
  if (Math.abs(num) >= 1000) {
    const k = num / 1000;
    const str = k.toFixed(1).replace(".", ",");
    return currency === Currency.USD ? `$${str}k` : `${str}k ₴`;
  }
  return formatMoney(amount, currency);
}

/** Parse user input like "$300", "12000 грн", "12 000" → amount + currency. */
export function parseMoneyInput(text: string): {
  amount: number;
  currency: Currency | null;
} {
  const t = text.trim();
  let currency: Currency | null = null;

  if (t.startsWith("$")) currency = Currency.USD;
  else if (/грн|uah|₴/i.test(t)) currency = Currency.UAH;

  const digits = t.replace(/[^\d.,]/g, "").replace(",", ".").replace(/\s/g, "");
  const amount = parseFloat(digits) || 0;
  return { amount, currency };
}
