import { prisma } from "@/lib/prisma";
import { ClientsList } from "@/components/clients/ClientsList";
import { deepSerialize } from "@/lib/serialize";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
      orders: {
        include: { works: true, parts: true },
      },
    },
    orderBy: { orders: { _count: "desc" } },
  });

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Клієнти</h1>
      </header>
      <div className="p-4">
        <ClientsList clients={deepSerialize(clients) as never} />
      </div>
    </div>
  );
}
