import Link from "next/link";
import { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/orders/KanbanBoard";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const raw = await prisma.order.findMany({
    include: { client: true, vehicle: true, works: true, parts: true },
    orderBy: { createdAt: "desc" },
  });

  // Active orders first (createdAt desc), then POSTPONED, then CLOSED
  const active = raw.filter(
    (o) => o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.POSTPONED
  );
  const postponed = raw.filter((o) => o.status === OrderStatus.POSTPONED);
  const closed = raw.filter((o) => o.status === OrderStatus.CLOSED);
  const orders = [...active, ...postponed, ...closed];

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <header className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Замовлення</h1>
        <Button asChild size="sm">
          <Link href="/orders/new">+ Нове</Link>
        </Button>
      </header>

      {/* Kanban board takes remaining height */}
      <KanbanBoard initialOrders={orders} />
    </div>
  );
}
