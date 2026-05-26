import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Currency } from "@prisma/client";
import { formatMoney } from "@/lib/currency";

interface ActiveDebtBannerProps {
  totalDebt: number;
  debtorsCount: number;
  displayCurrency: Currency;
}

export function ActiveDebtBanner({ totalDebt, debtorsCount, displayCurrency }: ActiveDebtBannerProps) {
  if (totalDebt < 0.01) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-800">
        <CheckCircle2 className="size-5 shrink-0" />
        <p className="text-sm font-medium">Активних боргів немає — всі оплатили</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-800">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="size-5 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-snug">
            Активна заборгованість: {formatMoney(totalDebt, displayCurrency)}
          </p>
          <p className="text-xs opacity-70">
            {debtorsCount} {debtorsCount === 1 ? "замовлення" : debtorsCount < 5 ? "замовлення" : "замовлень"} з боргом
          </p>
        </div>
      </div>
      <Link
        href="/"
        className="flex shrink-0 items-center gap-1 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-200"
      >
        Деталі
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
