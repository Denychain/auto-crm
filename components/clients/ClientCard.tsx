import Link from "next/link";
import { Phone } from "lucide-react";
import { formatMoney, formatPlate, calcOrderTotal } from "@/lib/utils";
import { OrderStatus } from "@prisma/client";

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface OrderSummary {
  status: OrderStatus;
  estimatedPrice: unknown;
  advancePayment: unknown;
  totalPaid: unknown;
  works: { price: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown }[];
}

interface ClientCardProps {
  id: string;
  name: string;
  phone: string;
  vehicles: Vehicle[];
  orders: OrderSummary[];
}

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object)) return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

export function ClientCard({ id, name, phone, vehicles, orders }: ClientCardProps) {
  const totalDebt = orders
    .filter((o) => o.status !== OrderStatus.CLOSED)
    .reduce((sum, o) => {
      const total = calcOrderTotal(
        o.works.map((w) => ({ price: n(w.price) })),
        o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
      );
      const debt = total - n(o.totalPaid) - n(o.advancePayment);
      return sum + (debt > 0.01 ? debt : 0);
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
        <a
          href={`tel:${phone}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Подзвонити"
        >
          <Phone className="size-4" />
        </a>
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
          <span className="font-semibold text-red-600">Борг: {formatMoney(totalDebt)}</span>
        )}
      </div>
    </Link>
  );
}
