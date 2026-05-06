import { Clock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { formatMoney } from "@/lib/utils";
import { BacklogRow } from "@/components/backlog/BacklogRow";

export const dynamic = "force-dynamic";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

export default async function BacklogPage() {
  const orders = await prisma.order.findMany({
    where: {
      status: OrderStatus.QUEUE,
      advancePayment: { gt: 0 },
    },
    include: {
      client: { select: { name: true, phone: true } },
      vehicle: { select: { plateNumber: true, make: true, model: true } },
      works: { select: { name: true, price: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const totalAdvance = orders.reduce((sum, o) => sum + n(o.advancePayment), 0);

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Clock className="size-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Черга очікування</h1>
        </div>
        <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            В черзі:{" "}
            <span className="font-semibold text-foreground">{orders.length}</span>
          </span>
          {totalAdvance > 0 && (
            <span>
              Завдатків:{" "}
              <span className="font-semibold text-green-700">
                {formatMoney(totalAdvance)}
              </span>
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-3 p-4 pb-10">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="mb-3 size-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Черга порожня</p>
            <p className="mt-1 text-sm text-muted-foreground/70">
              Записані клієнти з завдатком з'являться тут
            </p>
          </div>
        ) : (
          orders.map((o) => (
            <BacklogRow
              key={o.id}
              id={o.id}
              description={o.description}
              advancePayment={o.advancePayment}
              estimatedPrice={o.estimatedPrice}
              createdAt={o.createdAt}
              client={o.client}
              vehicle={o.vehicle}
            />
          ))
        )}
      </div>
    </div>
  );
}
