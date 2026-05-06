import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { ClientProfile } from "@/components/clients/ClientProfile";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      vehicles: { orderBy: { createdAt: "asc" } },
      orders: {
        include: {
          vehicle: true,
          works: true,
          parts: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) notFound();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/clients">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="truncate text-base font-semibold">{client.name}</h1>
      </header>
      <ClientProfile
        id={client.id}
        name={client.name}
        phone={client.phone}
        note={client.note}
        vehicles={client.vehicles}
        orders={client.orders as never}
      />
    </div>
  );
}
