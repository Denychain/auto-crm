import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { ShoppingCart, Clock, Users, ClipboardList } from "lucide-react";
import { calcOrderTotal } from "@/lib/utils";

export const dynamic = "force-dynamic";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

export default async function HomePage() {
  const [shoppingNeeded, backlogCount, activeOrders, totalClients] =
    await Promise.all([
      prisma.shoppingListItem.count({ where: { isNeeded: true } }),
      prisma.order.count({
        where: { status: OrderStatus.QUEUE, advancePayment: { gt: 0 } },
      }),
      prisma.order.findMany({
        where: {
          status: {
            notIn: [OrderStatus.CLOSED, OrderStatus.POSTPONED, OrderStatus.QUEUE],
          },
        },
        include: { works: true, parts: true },
      }),
      prisma.client.count(),
    ]);

  const inWorkCount = activeOrders.length;
  const totalDebt = activeOrders.reduce((sum, o) => {
    const total = calcOrderTotal(o.works, o.parts);
    const paid = n(o.totalPaid) + n(o.advancePayment);
    const d = total - paid;
    return sum + (d > 0.01 ? d : 0);
  }, 0);

  const widgets = [
    {
      href: "/orders",
      icon: ClipboardList,
      label: "В роботі",
      value: inWorkCount,
      sub: "активних замовлень",
      color: "bg-blue-50 text-blue-800",
    },
    {
      href: "/backlog",
      icon: Clock,
      label: "Черга",
      value: backlogCount,
      sub: "очікують виклику",
      color: backlogCount > 0 ? "bg-amber-50 text-amber-800" : "bg-muted text-muted-foreground",
    },
    {
      href: "/shopping",
      icon: ShoppingCart,
      label: "Закупки",
      value: shoppingNeeded,
      sub: shoppingNeeded > 0 ? "треба купити" : "все є в наявності",
      color: shoppingNeeded > 0 ? "bg-orange-50 text-orange-800" : "bg-muted text-muted-foreground",
    },
    {
      href: "/clients",
      icon: Users,
      label: "Клієнти",
      value: totalClients,
      sub: "в базі",
      color: "bg-muted text-muted-foreground",
    },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">🔧 АвтоСервіс CRM</h1>
      </header>

      <div className="flex flex-col gap-4 p-4 pb-10">
        {/* Quick stats grid */}
        <div className="grid grid-cols-2 gap-3">
          {widgets.map(({ href, icon: Icon, label, value, sub, color }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-col gap-2 rounded-xl p-4 transition-opacity hover:opacity-80 ${color}`}
            >
              <div className="flex items-center gap-1.5 opacity-80">
                <Icon className="size-4 shrink-0" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className="text-2xl font-bold leading-none">{value}</p>
              <p className="text-[11px] opacity-60">{sub}</p>
            </Link>
          ))}
        </div>

        {/* Debt summary */}
        {totalDebt > 0.01 && (
          <Link
            href="/finance"
            className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 hover:bg-red-100"
          >
            <div>
              <p className="text-sm font-semibold text-red-800">Загальний борг клієнтів</p>
              <p className="text-xs text-red-600">по активних замовленнях</p>
            </div>
            <p className="text-lg font-bold text-red-700">
              {new Intl.NumberFormat("uk-UA", {
                style: "currency",
                currency: "UAH",
                minimumFractionDigits: 0,
              }).format(totalDebt)}
            </p>
          </Link>
        )}

        {/* Shopping reminder */}
        {shoppingNeeded > 0 && (
          <Link
            href="/shopping"
            className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 hover:bg-orange-100"
          >
            <ShoppingCart className="size-5 shrink-0 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-orange-800">
                Треба купити {shoppingNeeded}{" "}
                {shoppingNeeded === 1 ? "позицію" : shoppingNeeded < 5 ? "позиції" : "позицій"}
              </p>
              <p className="text-xs text-orange-600">Натисни щоб переглянути список</p>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
