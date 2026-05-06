import { Phone, MessageCircle, Car, User, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { viberLink, telegramLink, smsLink, tplReadyToPickup } from "@/lib/messenger";
import type { FullOrder } from "@/types/orders";

export function VehicleClientInfo({ order }: { order: FullOrder }) {
  const { vehicle, client } = order;
  const msg = tplReadyToPickup(client.name);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Авто та клієнт</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {/* Vehicle */}
        <div className="flex items-start gap-2">
          <Car className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="font-medium">
              {vehicle.make} {vehicle.model}
              {vehicle.year ? (
                <span className="ml-1 text-muted-foreground">
                  {vehicle.year}р
                </span>
              ) : null}
            </p>
            <p className="text-muted-foreground">{vehicle.plateNumber}</p>
          </div>
        </div>

        {/* Client */}
        <div className="flex items-start gap-2">
          <User className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex-1">
            <p className="font-medium">{client.name}</p>
            <p className="text-muted-foreground">{client.phone}</p>
          </div>
        </div>

        {/* Messenger quick-links */}
        <div className="flex flex-wrap gap-2">
          <a
            href={`tel:${client.phone}`}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          >
            <Phone className="size-3.5" />
            Дзвінок
          </a>
          <a
            href={viberLink(client.phone, msg)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          >
            <MessageCircle className="size-3.5 text-violet-500" />
            Viber
          </a>
          <a
            href={telegramLink(msg)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          >
            <MessageCircle className="size-3.5 text-blue-500" />
            Telegram
          </a>
          <a
            href={smsLink(client.phone, msg)}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
          >
            <Phone className="size-3.5 text-green-600" />
            SMS
          </a>
        </div>

        {/* Description */}
        {order.description && (
          <div className="flex items-start gap-2 rounded-md bg-muted/50 p-2.5">
            <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-sm text-foreground">{order.description}</p>
          </div>
        )}

        {/* Client note */}
        {client.note && (
          <div className="rounded-md border border-dashed border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
            📝 {client.note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
