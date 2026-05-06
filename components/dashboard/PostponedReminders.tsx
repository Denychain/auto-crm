import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { formatPlate } from "@/lib/utils";
import { viberLink, tplPostponedFollowup } from "@/lib/messenger";

interface PostponedOrder {
  id: string;
  daysSince: number;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

export function PostponedReminders({ orders }: { orders: PostponedOrder[] }) {
  if (orders.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-stone-700">
        ⏸ Відкладені — пора нагадати ({orders.length})
      </h3>
      <div className="flex flex-col gap-2">
        {orders.map((o) => {
          const vehicleStr = `${o.vehicle.make} ${o.vehicle.model}`;
          const msg = tplPostponedFollowup(o.client.name, vehicleStr);
          return (
            <div
              key={o.id}
              className="flex items-center gap-3 rounded-xl border bg-stone-50 p-3"
            >
              <Link href={`/orders/${o.id}`} className="min-w-0 flex-1">
                <p className="font-medium leading-tight">{o.client.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{formatPlate(o.vehicle.plateNumber)}</span>
                  {" · "}{vehicleStr}
                </p>
                <p className="mt-0.5 text-xs text-stone-600">
                  Відкладено {o.daysSince}{" "}
                  {o.daysSince === 1 ? "день" : o.daysSince < 5 ? "дні" : "днів"} тому
                </p>
              </Link>
              <a
                href={viberLink(o.client.phone, msg)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700"
                aria-label="Написати в Viber"
              >
                <MessageSquare className="size-4" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
