import { TrendingUp, Package, Wallet, AlertCircle } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";
import type { FinanceAggregation } from "@/lib/finance";

interface FinanceSummaryCardsProps {
  data: FinanceAggregation;
  periodLabel: string;
  displayCurrency?: Currency;
}

export function FinanceSummaryCards({ data, periodLabel, displayCurrency = Currency.UAH }: FinanceSummaryCardsProps) {
  const cards = [
    {
      icon: TrendingUp,
      label: "Виручка",
      value: data.revenue,
      colorClass: "text-green-800 bg-green-50",
    },
    {
      icon: Package,
      label: "Витрати на матеріали",
      value: data.materials,
      colorClass: "text-orange-800 bg-orange-50",
    },
    {
      icon: Wallet,
      label: "Чистий прибуток",
      value: data.netProfit,
      colorClass:
        data.netProfit >= 0 ? "text-blue-800 bg-blue-50" : "text-red-800 bg-red-50",
    },
    {
      icon: AlertCircle,
      label: "Заборгованість",
      value: data.debt,
      colorClass:
        data.debt > 0.01
          ? "text-red-800 bg-red-50"
          : "text-green-800 bg-green-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ icon: Icon, label, value, colorClass }) => (
        <div key={label} className={`flex flex-col gap-2 rounded-xl p-4 ${colorClass}`}>
          <div className="flex items-center gap-1.5 opacity-80">
            <Icon className="size-3.5 shrink-0" />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </div>
          <p className="text-lg font-bold leading-none">{formatMoney(value, displayCurrency)}</p>
          <p className="text-[10px] opacity-50">за {periodLabel.toLowerCase()}</p>
        </div>
      ))}
    </div>
  );
}
