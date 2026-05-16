import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { VehicleHistory } from "@/components/clients/VehicleHistory";
import { formatPlate } from "@/lib/utils";
import { serializeOrder } from "@/lib/serialize";
import { Currency } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ plate: string }>;
}) {
  const { plate: rawPlate } = await params;
  const plate = decodeURIComponent(rawPlate).replace(/\s+/g, "").toUpperCase();

  const [vehicle, settings] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { plateNumber: plate },
      include: {
        client: true,
        orders: {
          include: {
            works: { orderBy: { id: "asc" } },
            parts: { orderBy: { id: "asc" } },
            photos: { orderBy: { createdAt: "asc" }, take: 3 },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!vehicle) notFound();

  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;

  return (
    <div className="flex min-h-full flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href={`/clients/${vehicle.client.id}`}>
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-base font-bold tracking-wider">
            {formatPlate(vehicle.plateNumber)}
          </p>
          <p className="text-xs text-muted-foreground">
            {vehicle.make} {vehicle.model}
            {vehicle.year ? ` · ${vehicle.year}р` : ""}
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4 pb-10">
        {/* Owner */}
        <Link
          href={`/clients/${vehicle.client.id}`}
          className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 hover:bg-muted/50"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <User className="size-4 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium leading-tight">{vehicle.client.name}</p>
            <p className="text-sm text-muted-foreground">{vehicle.client.phone}</p>
          </div>
        </Link>

        {/* Stats */}
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Замовлень за цим авто:{" "}
            <span className="font-semibold text-foreground">{vehicle.orders.length}</span>
          </p>
        </div>

        {/* Timeline */}
        <VehicleHistory orders={vehicle.orders.map(serializeOrder) as never} displayCurrency={displayCurrency} />
      </div>
    </div>
  );
}
