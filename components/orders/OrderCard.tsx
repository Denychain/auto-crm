"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Phone, GripVertical, AlertTriangle, Clock } from "lucide-react";
import type { OrderWithRelations } from "@/types/orders";
import { calcDebt, calcIdleDays, isOverdue, formatMoney, cn } from "@/lib/utils";

interface OrderCardProps {
  order: OrderWithRelations;
  isPending?: boolean;
  isOverlay?: boolean;
  isBacklog?: boolean;
}

export function OrderCard({ order, isPending, isOverlay, isBacklog }: OrderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: order.id,
      disabled: isOverlay,
    });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  const debt = calcDebt(order);
  const overdue = isOverdue(order);
  const idleDays = calcIdleDays(order.readyDate);
  const hasDebt = debt > 0.01;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative rounded-lg border bg-card shadow-sm select-none",
        "transition-[transform,opacity] duration-200",
        isDragging && "opacity-50 scale-105 shadow-lg",
        isOverlay && "rotate-1 shadow-xl",
        hasDebt && "border-l-4 border-l-red-500",
        overdue && "border-amber-400 ring-1 ring-amber-300",
        isPending && "opacity-60",
        isBacklog && "opacity-80 bg-amber-50/60"
      )}
    >
      {/* Spinner while pending server update */}
      {isPending && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/40">
          <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      )}

      {/* Drag handle */}
      {!isOverlay && (
        <button
          {...listeners}
          {...attributes}
          className="absolute right-1.5 top-1.5 touch-none rounded p-1 text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing cursor-grab"
          aria-label="Перетягнути картку"
          tabIndex={-1}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}

      {/* Clickable card body → order detail */}
      <Link href={`/orders/${order.id}`} className="block p-3 pb-8 pr-7">
        {/* Backlog badge */}
        {isBacklog && (
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold text-amber-700">
            <Clock className="size-3" />
            Очікує виклику
          </div>
        )}

        {/* Vehicle */}
        <p className="font-medium text-sm leading-snug">
          {order.vehicle.make} {order.vehicle.model}
          {order.vehicle.year ? (
            <span className="ml-1 text-xs text-muted-foreground font-normal">
              {order.vehicle.year}р
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {order.vehicle.plateNumber} · {order.client.name}
        </p>

        {/* Work description */}
        {order.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground/80">
            {order.description}
          </p>
        )}

        {/* Idle warning */}
        {overdue && (
          <div className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-700">
            <AlertTriangle className="size-3 shrink-0" />
            Простій {idleDays}д
          </div>
        )}

        {/* Debt / paid status */}
        <p className="mt-2 text-xs font-semibold">
          {hasDebt ? (
            <span className="text-red-600">До оплати: {formatMoney(debt)}</span>
          ) : (
            <span className="text-green-600">Сплачено повністю ✓</span>
          )}
        </p>
      </Link>

      {/* Phone button */}
      <a
        href={`tel:${order.client.phone}`}
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-2 right-2 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        aria-label={`Зателефонувати ${order.client.name}`}
      >
        <Phone className="size-3.5" />
      </a>
    </div>
  );
}
