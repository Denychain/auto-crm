import { TrendingUp, Package, Users, User, Heart, Scale } from "lucide-react";
import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";

interface FinanceSummaryCardsProps {
  revenue: number;
  materials: number;
  wagesMasters: number;
  wagesOwner: number;
  dreamFundContribution: number;
  unallocated: number;
  periodLabel: string;
  displayCurrency: Currency;
}

export function FinanceSummaryCards({
  revenue,
  materials,
  wagesMasters,
  wagesOwner,
  dreamFundContribution,
  unallocated,
  periodLabel,
  displayCurrency,
}: FinanceSummaryCardsProps) {
  const isUnallocatedOk = Math.abs(unallocated) < 1;

  const cards = [
    {
      icon: TrendingUp,
      label: "Виручка",
      value: revenue,
      colorClass: "text-green-800 bg-green-50",
      hint: null,
    },
    {
      icon: Package,
      label: "Матеріали",
      value: materials,
      colorClass: "text-orange-800 bg-orange-50",
      hint: null,
    },
    {
      icon: Users,
      label: "Виплачено майстрам",
      value: wagesMasters,
      colorClass: "text-blue-800 bg-blue-50",
      hint: null,
    },
    {
      icon: User,
      label: "Заробив власник",
      value: wagesOwner,
      colorClass: "text-emerald-800 bg-emerald-50",
      hint: null,
    },
    {
      icon: Heart,
      label: "Фонд «На мрію»",
      value: dreamFundContribution,
      colorClass: "text-purple-800 bg-purple-50",
      hint: "5% від виручки",
    },
    {
      icon: Scale,
      label: "Нерозподілено",
      value: unallocated,
      colorClass: isUnallocatedOk
        ? "text-gray-600 bg-gray-50"
        : unallocated > 0
        ? "text-amber-800 bg-amber-50"
        : "text-red-800 bg-red-50",
      hint: "Має бути ~0 — контрольна сума",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map(({ icon: Icon, label, value, colorClass, hint }) => (
        <div key={label} className={cn("flex flex-col gap-2 rounded-xl p-4", colorClass)}>
          <div className="flex items-center gap-1.5 opacity-80">
            <Icon className="size-3.5 shrink-0" />
            <span className="text-xs font-medium leading-tight">{label}</span>
          </div>
          <p className="text-lg font-bold leading-none tabular-nums">
            {formatMoney(value, displayCurrency)}
          </p>
          <p className="text-[10px] opacity-50">
            {hint ?? `за ${periodLabel.toLowerCase()}`}
          </p>
        </div>
      ))}
    </div>
  );
}
