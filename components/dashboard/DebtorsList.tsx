import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatPlate } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { viberLink } from "@/lib/messenger";
import { Currency } from "@prisma/client";

interface Debtor {
  orderId: string;
  debt: number;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

interface DebtorsListProps {
  debtors: Debtor[];
  totalDebt: number;
  displayCurrency?: Currency;
}

export function DebtorsList({ debtors, totalDebt, displayCurrency = Currency.UAH }: DebtorsListProps) {
  if (debtors.length === 0) return null;

  const shown = debtors.slice(0, 5);
  const hasMore = debtors.length > 5;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-red-800">
          💸 Борг клієнтів
        </h3>
        <span className="text-sm font-bold text-red-700">
          {formatMoney(totalDebt, displayCurrency)}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {shown.map((d) => {
          const msg = `Нагадуємо про оплату за ремонт ${d.vehicle.make} ${d.vehicle.model} (${formatPlate(d.vehicle.plateNumber)}). Сума: ${formatMoney(d.debt, displayCurrency)}`;
          return (
            <div
              key={d.orderId}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50/60 p-3"
            >
              <Link href={`/orders/${d.orderId}`} className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{d.client.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{formatPlate(d.vehicle.plateNumber)}</span>
                  {" · "}{d.vehicle.make} {d.vehicle.model}
                </p>
              </Link>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm font-bold text-red-700">
                  {formatMoney(d.debt, displayCurrency)}
                </span>
                <a
                  href={viberLink(d.client.phone, msg)}
                  className="flex size-8 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700"
                  aria-label="Написати в Viber"
                >
                  <MessageSquare className="size-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <Link
          href="/finance"
          className="text-center text-xs text-primary hover:underline"
        >
          Показати всі ({debtors.length}) →
        </Link>
      )}
    </div>
  );
}
