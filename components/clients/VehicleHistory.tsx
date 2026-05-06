import Link from "next/link";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { OrderStatus, PhotoType } from "@prisma/client";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { formatMoney, calcOrderTotal } from "@/lib/utils";

interface Work { name: string; price: unknown }
interface Part { estimatedPrice: unknown; actualPrice: unknown }
interface Photo { url: string; type: PhotoType }

interface HistoryOrder {
  id: string;
  status: OrderStatus;
  description: string | null;
  estimatedPrice: unknown;
  advancePayment: unknown;
  totalPaid: unknown;
  createdAt: Date;
  readyDate: Date | null;
  works: Work[];
  parts: Part[];
  photos?: Photo[];
}

interface VehicleHistoryProps {
  orders: HistoryOrder[];
}

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object)) return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

export function VehicleHistory({ orders }: VehicleHistoryProps) {
  if (orders.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Жодного замовлення за цим авто
      </p>
    );
  }

  return (
    <div className="relative flex flex-col gap-0">
      {/* Vertical line */}
      <div className="absolute left-[28px] top-6 bottom-6 w-px bg-border" />

      {orders.map((order, idx) => {
        const total = calcOrderTotal(
          order.works.map((w) => ({ price: n(w.price) })),
          order.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
        );
        const processPhoto = order.photos?.find((p) => p.type === PhotoType.PROCESS);

        return (
          <div key={order.id} className="relative flex gap-4 pb-6">
            {/* Timeline dot */}
            <div className="relative z-10 flex size-14 shrink-0 flex-col items-center justify-center rounded-full border-2 border-border bg-background text-center">
              <span className="text-[10px] font-medium leading-none text-muted-foreground">
                {format(order.createdAt, "MMM", { locale: uk }).toUpperCase()}
              </span>
              <span className="text-sm font-bold leading-tight">
                {format(order.createdAt, "yy")}
              </span>
            </div>

            {/* Order card */}
            <Link
              href={`/orders/${order.id}`}
              className="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {format(order.createdAt, "d MMMM yyyy", { locale: uk })}
                  </p>
                  {order.description && (
                    <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug">
                      {order.description}
                    </p>
                  )}
                </div>
                {processPhoto && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={processPhoto.url}
                    alt=""
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                )}
              </div>

              {/* Works list */}
              {order.works.length > 0 && (
                <ul className="flex flex-col gap-0.5">
                  {order.works.map((w, i) => (
                    <li key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{w.name}</span>
                      <span className="font-medium">{formatMoney(n(w.price))}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <StatusBadge status={order.status} />
                {total > 0 && (
                  <span className="text-sm font-bold">{formatMoney(total)}</span>
                )}
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
