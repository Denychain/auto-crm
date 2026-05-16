"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { OrderStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { KanbanColumn } from "./KanbanColumn";
import { OrderCard } from "./OrderCard";
import { updateOrderStatus } from "@/app/(crm)/orders/actions";
import type { OrderWithRelations } from "@/types/orders";

// Fixed column display order
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

interface KanbanBoardProps {
  initialOrders: OrderWithRelations[];
}

export function KanbanBoard({ initialOrders }: KanbanBoardProps) {
  const [orders, setOrders] = useState<OrderWithRelations[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [activeOrder, setActiveOrder] = useState<OrderWithRelations | null>(
    null
  );
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // PointerSensor: 8px distance threshold so short taps don't start drag
  // TouchSensor: 250ms delay to avoid conflict with column scroll
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const filtered = search.trim()
    ? orders.filter((o) => {
        const q = search.toLowerCase();
        return (
          o.client.name.toLowerCase().includes(q) ||
          o.vehicle.plateNumber.toLowerCase().includes(q) ||
          o.vehicle.make.toLowerCase().includes(q) ||
          o.vehicle.model.toLowerCase().includes(q)
        );
      })
    : orders;

  function handleDragStart({ active }: DragStartEvent) {
    setActiveOrder(orders.find((o) => o.id === active.id) ?? null);
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveOrder(null);
    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as OrderStatus;
    const order = orders.find((o) => o.id === orderId);

    if (!order || order.status === newStatus) return;

    // Optimistic update — move card to new column immediately
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );

    // Persist to server, show spinner on the card
    setPendingOrderId(orderId);
    startTransition(async () => {
      await updateOrderStatus(orderId, newStatus);
      setPendingOrderId(null);
    });
  }

  function handleDragCancel() {
    setActiveOrder(null);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Search bar */}
      <div className="shrink-0 border-b px-3 py-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Пошук: клієнт, номер, марка авто..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Kanban columns — horizontal scroll on mobile */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto p-3 pb-4">
          {STATUS_ORDER.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              orders={filtered.filter((o) => o.status === status)}
              pendingOrderId={pendingOrderId}
            />
          ))}
          {/* Trailing space for last column padding on mobile */}
          <div className="w-1 shrink-0" aria-hidden />
        </div>

        {/* Ghost card rendered at pointer position while dragging */}
        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeOrder ? (
            <OrderCard order={activeOrder} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
