import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { formatPlate, calcOrderTotal } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

interface ClosedOrder {
  id: string;
  updatedAt: Date;
  client: { name: string };
  vehicle: { plateNumber: string; make: string; model: string };
  works: { price: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown }[];
}

interface RecentClosedOrdersProps {
  orders: ClosedOrder[];
  weekRevenue: number;
  displayCurrency?: Currency;
}

export function RecentClosedOrders({
  orders,
  weekRevenue,
  displayCurrency = Currency.UAH,
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
          const total = calcOrderTotal(
            o.works.map((w) => ({ price: n(w.price) })),
            o.parts.map((p) => ({
              estimatedPrice: n(p.estimatedPrice),
              actualPrice: p.actualPrice != null ? n(p.actualPrice) : null,
            }))
          );
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
