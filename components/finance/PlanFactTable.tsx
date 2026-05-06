import Link from "next/link";
import { formatMoney, formatPlate } from "@/lib/utils";
import type { OrderPlanFact } from "@/lib/finance";

export function PlanFactTable({ orders }: { orders: OrderPlanFact[] }) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">📊 План / Факт матеріалів</h2>
        <p className="text-sm text-muted-foreground">
          Немає закритих замовлень за цей період
        </p>
      </div>
    );
  }

  const totalDiff = orders.reduce((s, o) => s + o.diff, 0);

  function diffClass(diff: number) {
    if (diff > 0.01) return "text-red-600";
    if (diff < -0.01) return "text-green-600";
    return "text-muted-foreground";
  }

  function diffLabel(diff: number) {
    if (Math.abs(diff) < 0.01) return "—";
    return `${diff > 0 ? "+" : ""}${formatMoney(diff)}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-semibold">📊 План / Факт матеріалів</h2>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-2 md:hidden">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="flex flex-col gap-1.5 rounded-xl border p-3 hover:bg-muted/30"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold">
                {formatPlate(o.vehicle.plateNumber)}
              </span>
              <span className={`text-sm font-bold ${diffClass(o.diff)}`}>
                {diffLabel(o.diff)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {o.client.name} · {o.vehicle.make} {o.vehicle.model}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>План: {formatMoney(o.planMaterials)}</span>
              <span>Факт: {formatMoney(o.factMaterials)}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-3 py-2 font-medium">Авто</th>
              <th className="px-3 py-2 font-medium">Клієнт</th>
              <th className="px-3 py-2 text-right font-medium">План</th>
              <th className="px-3 py-2 text-right font-medium">Факт</th>
              <th className="px-3 py-2 text-right font-medium">Різниця</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="px-3 py-2">
                  <Link href={`/orders/${o.id}`} className="hover:underline">
                    <span className="font-mono font-medium">
                      {formatPlate(o.vehicle.plateNumber)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {o.vehicle.make} {o.vehicle.model}
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{o.client.name}</td>
                <td className="px-3 py-2 text-right">{formatMoney(o.planMaterials)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(o.factMaterials)}</td>
                <td className={`px-3 py-2 text-right font-semibold ${diffClass(o.diff)}`}>
                  {diffLabel(o.diff)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div
        className={`rounded-lg px-4 py-3 text-sm font-medium ${
          totalDiff > 0.01 ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
        }`}
      >
        {totalDiff > 0.01
          ? `Перевитрата матеріалів: ${formatMoney(totalDiff)} — це втрачений прибуток`
          : totalDiff < -0.01
          ? `Економія на матеріалах: ${formatMoney(Math.abs(totalDiff))}`
          : "Матеріали в бюджеті — відхилень немає"}
      </div>
    </div>
  );
}
