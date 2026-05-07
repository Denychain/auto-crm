function isDecimal(v: unknown): v is { toNumber(): number } {
  return (
    v !== null &&
    typeof v === "object" &&
    "toNumber" in (v as object) &&
    typeof (v as { toNumber: unknown }).toNumber === "function"
  );
}

/** Recursively converts all Prisma Decimal instances to plain numbers. */
export function deepSerialize<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (isDecimal(value)) return value.toNumber() as unknown as T;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map(deepSerialize) as unknown as T;
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        deepSerialize(v),
      ])
    ) as unknown as T;
  }
  return value;
}

/** Convenience alias for a single order object. */
export function serializeOrder<T extends object>(order: T): T {
  return deepSerialize(order);
}
