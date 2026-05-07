import { Currency } from "@prisma/client";
import { formatMoney, convert } from "@/lib/currency";
import { cn } from "@/lib/utils";

type DecimalLike = { toNumber(): number } | number | string | null | undefined;

interface MoneyDisplayProps {
  amount: DecimalLike;
  currency: Currency;
  exchangeRate?: DecimalLike;
  displayCurrency?: Currency;
  className?: string;
  short?: boolean;
}

function toN(v: DecimalLike): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
}

export function MoneyDisplay({
  amount,
  currency,
  exchangeRate,
  displayCurrency,
  className,
  short: _short,
}: MoneyDisplayProps) {
  const target = displayCurrency ?? currency;
  const rate = toN(exchangeRate) || undefined;

  const displayAmount = convert(
    { amount, currency, exchangeRate: rate },
    target,
    rate
  );

  const showOriginal = target !== currency && toN(amount) > 0;

  return (
    <span
      className={cn("tabular-nums", className)}
      title={rate ? `Курс на дату: ${rate} ₴/$` : undefined}
    >
      {formatMoney(displayAmount, target)}
      {showOriginal && (
        <span className="ml-1 text-muted-foreground opacity-60">
          ({formatMoney(amount, currency)})
        </span>
      )}
    </span>
  );
}
