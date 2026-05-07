type DecimalLike = { toNumber(): number } | null | undefined;

function d(v: DecimalLike): number | null {
  if (v == null) return null;
  return typeof v === "object" && "toNumber" in v ? v.toNumber() : Number(v);
}

function dn(v: DecimalLike): number {
  return d(v) ?? 0;
}

export function serializeOrder<
  T extends {
    estimatedPrice: DecimalLike;
    advancePayment: DecimalLike;
    totalPaid: DecimalLike;
    baseExchangeRate?: DecimalLike;
    works?: Array<{
      price: DecimalLike;
      exchangeRate?: DecimalLike;
      [key: string]: unknown;
    }>;
    parts?: Array<{
      estimatedPrice: DecimalLike;
      actualPrice?: DecimalLike;
      exchangeRate?: DecimalLike;
      [key: string]: unknown;
    }>;
    workerShares?: Array<{
      amount: DecimalLike;
      exchangeRate?: DecimalLike;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  },
>(order: T) {
  return {
    ...order,
    estimatedPrice: dn(order.estimatedPrice),
    advancePayment: dn(order.advancePayment),
    totalPaid: dn(order.totalPaid),
    baseExchangeRate: d(order.baseExchangeRate),
    works: order.works?.map((w) => ({
      ...w,
      price: dn(w.price),
      exchangeRate: d(w.exchangeRate),
    })),
    parts: order.parts?.map((p) => ({
      ...p,
      estimatedPrice: dn(p.estimatedPrice),
      actualPrice: d(p.actualPrice),
      exchangeRate: d(p.exchangeRate),
    })),
    workerShares: order.workerShares?.map((ws) => ({
      ...ws,
      amount: dn(ws.amount),
      exchangeRate: d(ws.exchangeRate),
    })),
  };
}
