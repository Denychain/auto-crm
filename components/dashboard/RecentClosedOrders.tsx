import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { formatPlate } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { computeOrderTotals, type OrderForTotals } from "@/lib/finance-pure";
import { Currency } from "@prisma/client";

interface ClosedOrder {
  id: string;
  updatedAt: Date;
  client: { name: string };
  vehicle: { plateNumber: string; make: string; model: string };
  currency?: string;
  baseExchangeRate?: unknown;
  works: { price: unknown; currency?: string; exchangeRate?: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown; currency?: string; exchangeRate?: unknown }[];
}

interface RecentClosedOrdersProps {
  orders: ClosedOrder[];
  weekRevenue: number;
  displayCurrency?: Currency;
  fallbackRate?: number;
}

export function RecentClosedOrders({
  orders,
  weekRevenue,
  displayCurrency = Currency.UAH,
  fallbackRate = 41,
}: RecentClosedOrdersProps) {
  if (orders.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📊 Цього тижня закрито</h3>
        <span className="text-sm font-bold text-green-700">
          {formatMoney(weekRevenue, displayCurrency)}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const total = computeOrderTotals(
            o as OrderForTotals,
            displayCurrency,
            fallbackRate
          ).orderTotal;
          return (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center gap-3 rounded-xl border bg-green-50/60 p-3 hover:bg-green-50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">
                  {formatPlate(o.vehicle.plateNumber)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.client.name} · {o.vehicle.make} {o.vehicle.model}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(o.updatedAt, "d MMM", { locale: uk })}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold text-green-700">
                {formatMoney(total, displayCurrency)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
