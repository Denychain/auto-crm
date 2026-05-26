import Link from "next/link";
import { Phone } from "lucide-react";
import { formatPlate } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { computeOrderTotals, type OrderForTotals } from "@/lib/finance-pure";
import { Currency, OrderStatus } from "@prisma/client";

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface OrderSummary {
  status: OrderStatus;
  currency?: string;
  baseExchangeRate?: unknown;
  estimatedPrice: unknown;
  advancePayment: unknown;
  totalPaid: unknown;
  works: { price: unknown; currency?: string; exchangeRate?: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown; currency?: string; exchangeRate?: unknown }[];
}

interface ClientCardProps {
  id: string;
  name: string;
  phone: string;
  vehicles: Vehicle[];
  orders: OrderSummary[];
  displayCurrency?: Currency;
  fallbackRate?: number;
}

export function ClientCard({
  id,
  name,
  phone,
  vehicles,
  orders,
  displayCurrency = Currency.UAH,
  fallbackRate = 41,
}: ClientCardProps) {
  const totalDebt = orders
    .filter((o) => o.status !== OrderStatus.CLOSED)
    .reduce((sum, o) => {
      const totals = computeOrderTotals(o as OrderForTotals, displayCurrency, fallbackRate);
      return sum + (totals.outstanding > 0.01 ? totals.outstanding : 0);
    }, 0);

  return (
    <Link
      href={`/clients/${id}`}
      className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      {/* Name + call button */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold leading-tight">{name}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{phone}</p>
        </div>
        {/* <a> всередині <Link> = вкладені <a> → заборонено в HTML.
            Використовуємо <button> з програмним переходом. */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = `tel:${phone}`;
          }}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Подзвонити"
        >
          <Phone className="size-4" />
        </button>
      </div>

      {/* Vehicle chips */}
      {vehicles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {vehicles.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 rounded-full border bg-muted/40 px-2 py-0.5 text-xs"
            >
              <span className="font-mono font-medium">{formatPlate(v.plateNumber)}</span>
              <span className="text-muted-foreground">{v.make} {v.model}</span>
            </span>
          ))}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Замовлень: {orders.length}</span>
        {totalDebt > 0.01 && (
          <span className="font-semibold text-red-600">Борг: {formatMoney(totalDebt, displayCurrency)}</span>
        )}
      </div>
    </Link>
  );
}
