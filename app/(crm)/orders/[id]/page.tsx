import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { serializeOrder } from "@/lib/serialize";
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

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      client: true,
      vehicle: true,
      works: { orderBy: { id: "asc" } },
      parts: { orderBy: { id: "asc" } },
      photos: { orderBy: { createdAt: "asc" } },
      workerShares: { orderBy: { id: "asc" } },
    },
  });

  if (!order) notFound();

  const o = serializeOrder(order);

  return (
    <div className="flex min-h-full flex-col">
      <OrderHeader order={o as never} />

      <div className="flex flex-col gap-4 p-4 pb-10">
        <VehicleClientInfo order={o as never} />
        <WorksConstructor orderId={o.id} initialWorks={o.works as never} />
        <PartsChecklist orderId={o.id} initialParts={o.parts as never} />
        <FinanceBlock order={o as never} />
        <WorkerShares
          orderId={o.id}
          initialShares={o.workerShares as never}
          order={o as never}
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
