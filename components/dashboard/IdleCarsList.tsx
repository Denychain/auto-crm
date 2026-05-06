import Link from "next/link";
import { Phone, MessageSquare } from "lucide-react";
import { formatPlate } from "@/lib/utils";
import { viberLink, tplReadyToPickup } from "@/lib/messenger";

interface IdleCar {
  id: string;
  idleDays: number;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

export function IdleCarsList({ cars }: { cars: IdleCar[] }) {
  if (cars.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-amber-800">
        🕐 Авто готові, але не забрали ({cars.length})
      </h3>
      <div className="flex flex-col gap-2">
        {cars.map((car) => {
          const msg = tplReadyToPickup(car.client.name);
          return (
            <div
              key={car.id}
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3"
            >
              <Link href={`/orders/${car.id}`} className="min-w-0 flex-1">
                <p className="font-mono text-sm font-semibold">
                  {formatPlate(car.vehicle.plateNumber)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {car.client.name} · {car.vehicle.make} {car.vehicle.model}
                </p>
                <p className="mt-0.5 text-xs font-medium text-amber-700">
                  Готово {car.idleDays}{" "}
                  {car.idleDays === 1 ? "день" : car.idleDays < 5 ? "дні" : "днів"}
                </p>
              </Link>
              <div className="flex shrink-0 gap-1">
                <a
                  href={`tel:${car.client.phone}`}
                  className="flex size-9 items-center justify-center rounded-full border bg-background text-muted-foreground hover:text-foreground"
                  aria-label="Подзвонити"
                >
                  <Phone className="size-4" />
                </a>
                <a
                  href={viberLink(car.client.phone, msg)}
                  className="flex size-9 items-center justify-center rounded-full border bg-violet-600 text-white hover:bg-violet-700"
                  aria-label="Написати в Viber"
                >
                  <MessageSquare className="size-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
