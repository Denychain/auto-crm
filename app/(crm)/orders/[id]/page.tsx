import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/serialize";
import { computeOrderTotals } from "@/lib/finance";
import { getCurrentRate } from "@/lib/exchange-rate";
import { Currency } from "@prisma/client";
import { OrderHeader } from "@/components/orders/OrderDetail/OrderHeader";
import { VehicleClientInfo } from "@/components/orders/OrderDetail/VehicleClientInfo";
import { WorksConstructor } from "@/components/orders/OrderDetail/WorksConstructor";
import { PartsChecklist } from "@/components/orders/OrderDetail/PartsChecklist";
import { FinanceBlock } from "@/components/orders/OrderDetail/FinanceBlock";
import { WorkerShares } from "@/components/orders/OrderDetail/WorkerShares";
import { ProcessPhotos } from "@/components/orders/OrderDetail/ProcessPhotos";
import { OrderActions } from "@/components/orders/OrderDetail/OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [settings, rate] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    getCurrentRate().then((r) => r.toNumber()).catch(() => 41),
  ]);
  const displayCurrency = ((settings as { displayCurrency?: string } | null)?.displayCurrency ?? Currency.UAH) as Currency;

  const [order, templates, workers] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        vehicle: true,
        works: { orderBy: { id: "asc" } },
        parts: { orderBy: { id: "asc" } },
        photos: { orderBy: { createdAt: "asc" } },
        workerShares: { orderBy: { id: "asc" } },
      },
    }),
    prisma.shareTemplate.findMany({
      include: { rules: true },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }],
    }),
    prisma.worker.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  if (!order) notFound();

  // Обчислюємо всі фінансові суми на сервері — єдина точка правди
  const totals = computeOrderTotals(
    order as Parameters<typeof computeOrderTotals>[0],
    displayCurrency,
    rate,
  );

  const o = serializeOrder(order);

  return (
    <div className="flex min-h-full flex-col">
      <OrderHeader order={o as never} />

      <div className="flex flex-col gap-4 p-4 pb-10">
        <VehicleClientInfo order={o as never} />
        <WorksConstructor
          orderId={o.id}
          initialWorks={o.works as never}
          worksTotal={totals.worksTotal}
        />
        <PartsChecklist orderId={o.id} initialParts={o.parts as never} />
        <FinanceBlock order={o as never} totals={totals} />
        <WorkerShares
          orderId={o.id}
          initialShares={o.workerShares as never}
          order={o as never}
          totals={totals}
          templates={templates as never}
          workers={workers as never}
        />
        <ProcessPhotos
          orderId={o.id}
          initialPhotos={order.photos}
          clientPhone={o.client.phone}
          clientName={o.client.name}
        />
        <OrderActions orderId={o.id} status={o.status} />
      </div>
    </div>
  );
}
