"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertTriangle, Phone } from "lucide-react";
import { OrderStatus } from "@prisma/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { STATUS_LABELS } from "@/lib/constants";
import { updateOrderStatus } from "@/app/orders/actions";
import { calcIdleDays, isOverdue, cn } from "@/lib/utils";
import { viberLink, telegramLink } from "@/lib/messenger";
import type { FullOrder } from "@/types/orders";

const STATUS_ORDER: OrderStatus[] = [
  OrderStatus.QUEUE,
  OrderStatus.DISASSEMBLY,
  OrderStatus.PREP,
  OrderStatus.PAINT,
  OrderStatus.ASSEMBLY,
  OrderStatus.STOP_PARTS,
  OrderStatus.STOP_PAINT,
  OrderStatus.DONE,
  OrderStatus.CLOSED,
  OrderStatus.POSTPONED,
];

export function OrderHeader({ order }: { order: FullOrder }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const overdue = isOverdue(order);
  const idleDays = calcIdleDays(order.readyDate);

  function changeStatus(newStatus: OrderStatus) {
    if (newStatus === order.status) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await updateOrderStatus(order.id, newStatus);
      router.refresh();
      setOpen(false);
    });
  }

  const viberMsg = viberLink(order.client.phone, `Доброго дня, ${order.client.name}!`);
  const tgMsg = telegramLink(`Доброго дня, ${order.client.name}!`);

  return (
    <header className="sticky top-0 z-20 border-b bg-background">
      <div className="flex items-center gap-2 px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/orders">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>

        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">
            {order.vehicle.make} {order.vehicle.model}
            {order.vehicle.year ? (
              <span className="ml-1 text-sm font-normal text-muted-foreground">
                {order.vehicle.year}р
              </span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <span className="font-mono">{order.vehicle.plateNumber}</span>
            <span>·</span>
            <a
              href={`tel:${order.client.phone}`}
              className="font-medium text-foreground hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {order.client.name}
            </a>
            <span>·</span>
            <a
              href={viberMsg}
              className="text-violet-600 hover:underline"
              title="Viber"
              onClick={(e) => e.stopPropagation()}
            >
              V
            </a>
            <a
              href={tgMsg}
              className="text-sky-500 hover:underline"
              title="Telegram"
              onClick={(e) => e.stopPropagation()}
            >
              TG
            </a>
          </div>
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>Прийнято: {format(order.createdAt, "dd.MM.yyyy")}</span>
            {order.readyDate && (
              <span>Готово: {format(order.readyDate, "dd.MM.yyyy")}</span>
            )}
          </div>
        </div>

        {/* Quick call button */}
        <a
          href={`tel:${order.client.phone}`}
          className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Подзвонити"
          onClick={(e) => e.stopPropagation()}
        >
          <Phone className="size-4" />
        </a>

        {/* Tap to change status */}
        <button
          onClick={() => setOpen(true)}
          disabled={isPending}
          className="shrink-0"
          aria-label="Змінити статус"
        >
          <StatusBadge status={order.status} />
        </button>
      </div>

      {/* Idle strip — only when DONE + overdue */}
      {overdue && (
        <div className="flex items-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="size-3.5 shrink-0" />
          Авто чекає вже {idleDays} днів — нагадайте клієнту забрати!
        </div>
      )}

      {/* Status picker dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Змінити статус</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {STATUS_ORDER.map((status) => {
              const { label, emoji, color } = STATUS_LABELS[status];
              const isCurrent = order.status === status;
              return (
                <button
                  key={status}
                  onClick={() => changeStatus(status)}
                  disabled={isPending}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition-colors",
                    isCurrent
                      ? cn(color, "font-semibold ring-1 ring-inset ring-current/20")
                      : "hover:bg-muted"
                  )}
                >
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="flex-1">{label}</span>
                  {isCurrent && (
                    <span className="text-xs text-muted-foreground">
                      поточний
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
