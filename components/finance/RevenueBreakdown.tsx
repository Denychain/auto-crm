import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";

interface RevenueBreakdownProps {
  revenue: number;
  materials: number;
  wagesMasters: number;
  wagesOwner: number;
  dreamFundContribution: number;
  unallocated: number;
  displayCurrency?: Currency;
}

export function RevenueBreakdown({
  revenue,
  materials,
  wagesMasters,
  wagesOwner,
  dreamFundContribution,
  unallocated,
  displayCurrency = Currency.UAH,
}: RevenueBreakdownProps) {
  if (revenue < 0.01) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">📈 Розподіл виручки</h2>
        <p className="text-sm text-muted-foreground">Немає даних за цей період</p>
      </div>
    );
  }

  const segments = [
    {
      label: "Матеріали",
      value: materials,
      barClass: "bg-orange-400",
      dotClass: "bg-orange-400",
    },
    {
      label: "Майстри",
      value: wagesMasters,
      barClass: "bg-blue-400",
      dotClass: "bg-blue-400",
    },
    {
      label: "Власник",
      value: wagesOwner,
      barClass: "bg-green-500",
      dotClass: "bg-green-500",
    },
    {
      label: "Фонд мрії",
      value: dreamFundContribution,
      barClass: "bg-purple-400",
      dotClass: "bg-purple-400",
    },
    {
      label: "Нерозподілено",
      value: Math.abs(unallocated),
      barClass: "bg-gray-300",
      dotClass: "bg-gray-400",
    },
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
          if (s.value < 0.01 && pct < 0.1) return null;
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
