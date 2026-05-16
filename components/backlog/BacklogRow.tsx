"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { differenceInDays } from "date-fns";
import { Phone, FileText, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatPlate } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { cancelBacklogEntry } from "@/app/(crm)/backlog/actions";
import { CallDialog } from "./CallDialog";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

interface BacklogRowProps {
  id: string;
  description: string | null;
  advancePayment: unknown;
  estimatedPrice: unknown;
  createdAt: Date;
  client: { name: string; phone: string };
  vehicle: { plateNumber: string; make: string; model: string };
}

export function BacklogRow({
  id,
  description,
  advancePayment,
  estimatedPrice,
  createdAt,
  client,
  vehicle,
}: BacklogRowProps) {
  const [callOpen, setCallOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { displayCurrency } = useCurrency();

  const daysAgo = differenceInDays(new Date(), createdAt);
  const advance = n(advancePayment);
  const estimated = n(estimatedPrice);

  function handleCancel() {
    if (!confirm(`Скасувати запис ${client.name}? Замовлення перейде у "Відкладено".`)) return;
    startTransition(async () => {
      await cancelBacklogEntry(id);
      toast.success("Запис скасовано");
    });
  }

  return (
    <>
      <CallDialog
        open={callOpen}
        onOpenChange={setCallOpen}
        orderId={id}
        clientName={client.name}
        phone={client.phone}
        plateNumber={formatPlate(vehicle.plateNumber)}
        make={vehicle.make}
        model={vehicle.model}
      />

      <div className="flex gap-3 rounded-xl border bg-card p-4 shadow-sm">
        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {/* Plate + make/model */}
          <div>
            <p className="font-mono text-lg font-bold tracking-wider leading-tight">
              {formatPlate(vehicle.plateNumber)}
            </p>
            <p className="text-sm text-muted-foreground">
              {vehicle.make} {vehicle.model}
            </p>
          </div>

          {/* Client name + description */}
          <div>
            <p className="font-medium leading-snug">{client.name}</p>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          {/* Footer stats */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="font-semibold text-green-700">
              Завдаток: {formatMoney(advance, displayCurrency)}
            </span>
            {estimated > 0 && (
              <span className="text-muted-foreground">
                Орієнтовно: {formatMoney(estimated, displayCurrency)}
              </span>
            )}
            <span className="text-muted-foreground">
              {daysAgo === 0 ? "Сьогодні" : `${daysAgo} ${daysAgo === 1 ? "день" : daysAgo < 5 ? "дні" : "днів"} тому`}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-col gap-2">
          <Button
            size="sm"
            className="h-10 px-3"
            onClick={() => setCallOpen(true)}
            disabled={isPending}
          >
            <Phone className="size-4" />
            <span className="ml-1.5 hidden sm:inline">Викликати</span>
          </Button>

          <Button asChild size="sm" variant="outline" className="h-9 px-3">
            <Link href={`/orders/${id}`}>
              <FileText className="size-4" />
              <span className="ml-1.5 hidden sm:inline">Деталі</span>
            </Link>
          </Button>

          <button
            onClick={handleCancel}
            disabled={isPending}
            className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-destructive/30 px-3 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <XCircle className="size-4" />
            )}
            <span className="hidden sm:inline">Скасувати</span>
          </button>
        </div>
      </div>
    </>
  );
}
