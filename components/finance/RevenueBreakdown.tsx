import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";

interface RevenueBreakdownProps {
  revenue: number;
  materials: number;
  wages: number;
  displayCurrency?: Currency;
}

export function RevenueBreakdown({ revenue, materials, wages, displayCurrency = Currency.UAH }: RevenueBreakdownProps) {
  const ownerProfit = Math.max(0, revenue - materials - wages);

  if (revenue < 0.01) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">📈 Розподіл виручки</h2>
        <p className="text-sm text-muted-foreground">Немає даних за цей період</p>
      </div>
    );
  }

  const segments = [
    { label: "Матеріали", value: materials, barClass: "bg-orange-400", dotClass: "bg-orange-400" },
    { label: "Зарплати майстрів", value: wages, barClass: "bg-blue-400", dotClass: "bg-blue-400" },
    { label: "Чистий заробіток", value: ownerProfit, barClass: "bg-green-500", dotClass: "bg-green-500" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold">📈 Розподіл виручки</h2>

      {/* Stacked bar */}
      <div className="flex h-7 w-full overflow-hidden rounded-full bg-muted">
        {segments.map((s) => {
          const pct = revenue > 0 ? (s.value / revenue) * 100 : 0;
          if (pct < 0.3) return null;
          return (
            <div
              key={s.label}
              className={s.barClass}
              style={{ width: `${pct}%` }}
              title={`${s.label}: ${formatMoney(s.value, displayCurrency)} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((s) => {
          const pct = revenue > 0 ? (s.value / revenue) * 100 : 0;
          return (
            <div key={s.label} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className={`size-3 shrink-0 rounded-full ${s.dotClass}`} />
                <span className="text-muted-foreground">{s.label}</span>
              </div>
              <div className="flex items-center gap-2 tabular-nums">
                <span className="font-medium">{formatMoney(s.value, displayCurrency)}</span>
                <span className="w-9 text-right text-xs text-muted-foreground">
                  {Math.round(pct)}%
                </span>
              </div>
            </div>
          );
        })}

        <div className="flex items-center justify-between border-t pt-2 text-sm font-medium">
          <span>Виручка всього</span>
          <span className="font-bold">{formatMoney(revenue, displayCurrency)}</span>
        </div>
      </div>
    </div>
  );
}
