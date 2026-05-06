"use client";

import { useDroppable } from "@dnd-kit/core";
import { OrderStatus } from "@prisma/client";
import { Clock } from "lucide-react";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { OrderWithRelations } from "@/types/orders";
import { OrderCard } from "./OrderCard";

interface KanbanColumnProps {
  status: OrderStatus;
  orders: OrderWithRelations[];
  pendingOrderId: string | null;
}

function isBacklog(order: OrderWithRelations): boolean {
  const v = order.advancePayment;
  if (v == null) return false;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber() > 0;
  return Number(v) > 0;
}

export function KanbanColumn({
  status,
  orders,
  pendingOrderId,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, emoji, color } = STATUS_LABELS[status];

  // For QUEUE: split into backlog (advance > 0) and regular
  const backlogOrders =
    status === OrderStatus.QUEUE ? orders.filter(isBacklog) : [];
  const regularOrders =
    status === OrderStatus.QUEUE ? orders.filter((o) => !isBacklog(o)) : orders;

  return (
    <div className="flex w-[280px] flex-none flex-col rounded-xl border bg-muted/30 overflow-hidden">
      {/* Column header */}
      <div className={cn("flex items-center gap-2 px-3 py-2.5", color)}>
        <span aria-hidden>{emoji}</span>
        <span className="font-medium text-sm truncate">{label}</span>
        <span className="ml-auto shrink-0 rounded-full bg-black/10 px-2 py-0.5 text-xs font-semibold tabular-nums">
          {orders.length}
        </span>
      </div>

      {/* Droppable cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex flex-col gap-2 flex-1 min-h-[120px] p-2",
          "overflow-y-auto",
          "max-h-[calc(100dvh-220px)]",
          "transition-colors duration-150",
          isOver && "bg-primary/5 ring-2 ring-primary/20 ring-inset"
        )}
      >
        {/* Backlog subsection */}
        {backlogOrders.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <Clock className="size-3 text-amber-600" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Очікують виклику
              </span>
            </div>
            {backlogOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                isPending={pendingOrderId === order.id}
                isBacklog
              />
            ))}
            {regularOrders.length > 0 && (
              <div className="my-1 border-t border-dashed" />
            )}
          </div>
        )}

        {/* Regular orders */}
        {regularOrders.length === 0 && backlogOrders.length === 0 ? (
          <div
            className={cn(
              "flex flex-1 items-center justify-center py-8",
              "text-xs text-muted-foreground",
              isOver && "text-primary/60"
            )}
          >
            Порожньо
          </div>
        ) : (
          regularOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              isPending={pendingOrderId === order.id}
            />
          ))
        )}
      </div>
    </div>
  );
}
