import Link from "next/link";
import { formatPlate } from "@/lib/utils";
import { STATUS_LABELS } from "@/lib/constants";
import { OrderStatus } from "@prisma/client";

interface StopOrder {
  id: string;
  status: OrderStatus;
  description: string | null;
  client: { name: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

export function STOPSection({ orders }: { orders: StopOrder[] }) {
  if (orders.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-red-800">
        ⛔ Зупинено — потрібна дія ({orders.length})
      </h3>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const { label } = STATUS_LABELS[o.status];
          return (
            <Link
              key={o.id}
              href={`/orders/${o.id}`}
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 hover:bg-red-100"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">
                  {formatPlate(o.vehicle.plateNumber)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {o.client.name} · {o.vehicle.make} {o.vehicle.model}
                </p>
                {o.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground/80">
                    {o.description}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 border border-red-300">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
