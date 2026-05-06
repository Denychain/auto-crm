import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
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

  return (
    <div className="flex min-h-full flex-col">
      <OrderHeader order={order} />

      <div className="flex flex-col gap-4 p-4 pb-10">
        <VehicleClientInfo order={order} />
        <WorksConstructor orderId={order.id} initialWorks={order.works} />
        <PartsChecklist orderId={order.id} initialParts={order.parts} />
        <FinanceBlock order={order} />
        <WorkerShares
          orderId={order.id}
          initialShares={order.workerShares}
          order={order}
        />
        <ProcessPhotos
          orderId={order.id}
          initialPhotos={order.photos}
          clientPhone={order.client.phone}
          clientName={order.client.name}
        />
        <OrderActions orderId={order.id} status={order.status} />
      </div>
    </div>
  );
}
