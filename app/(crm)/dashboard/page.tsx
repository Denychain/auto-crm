import { ClipboardList, Clock, Wallet, Users } from "lucide-react";
import { OrderStatus, Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { calcIdleDays } from "@/lib/utils";
import { aggregateDebtors, computeOrderTotals, type OrderForTotals } from "@/lib/finance";
import { formatMoney } from "@/lib/currency";
import { IDLE_THRESHOLD_DAYS, POSTPONED_REMINDER_DAYS } from "@/lib/constants";
import { deepSerialize } from "@/lib/serialize";
import { Greeting } from "@/components/dashboard/Greeting";
import { StatCard } from "@/components/dashboard/StatCard";
import { IdleCarsList } from "@/components/dashboard/IdleCarsList";
import { STOPSection } from "@/components/dashboard/STOPSection";
import { DebtorsList } from "@/components/dashboard/DebtorsList";
import { PostponedReminders } from "@/components/dashboard/PostponedReminders";
import { ShoppingNeededWidget } from "@/components/dashboard/ShoppingNeededWidget";
import { RecentClosedOrders } from "@/components/dashboard/RecentClosedOrders";
import { WebRequestsWidget } from "@/components/dashboard/WebRequestsWidget";

export const dynamic = "force-dynamic";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

export default async function HomePage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const postponedCutoff = new Date(
    now.getTime() - POSTPONED_REMINDER_DAYS * 24 * 60 * 60 * 1000
  );

  const [nonClosed, shopping, recentClosed, backlogCount, clientCount, settings, latestRate, webRequests] =
    await Promise.all([
      prisma.order.findMany({
        where: { status: { not: OrderStatus.CLOSED } },
        include: {
          client: { select: { name: true, phone: true } },
          vehicle: { select: { plateNumber: true, make: true, model: true } },
          works: { select: { price: true, currency: true, exchangeRate: true } },
          parts: { select: { estimatedPrice: true, actualPrice: true, currency: true, exchangeRate: true } },
        },
      }),
      prisma.shoppingListItem.findMany({
        where: { isNeeded: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.order.findMany({
        where: {
          status: OrderStatus.CLOSED,
          updatedAt: { gte: sevenDaysAgo },
        },
        include: {
          client: { select: { name: true } },
          vehicle: { select: { plateNumber: true, make: true, model: true } },
          works: { select: { price: true, currency: true, exchangeRate: true } },
          parts: { select: { estimatedPrice: true, actualPrice: true, currency: true, exchangeRate: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      }),
      prisma.order.count({
        where: { status: OrderStatus.QUEUE, advancePayment: { gt: 0 } },
      }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.settings.findUnique({ where: { id: "singleton" } }),
      prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } }),
      prisma.order.findMany({
        where: { fromWebsite: true, status: OrderStatus.QUEUE },
        include: {
          client:  { select: { name: true, phone: true } },
          vehicle: { select: { make: true, model: true } },
          photos:  { take: 1, orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;
  const fallbackRate = n(latestRate?.usdToUah) || 41;
  const nonClosedS = deepSerialize(nonClosed);
  const recentClosedS = deepSerialize(recentClosed);

  // Derived collections (use serialized arrays — all Decimal already converted to number)
  const activeOrders = nonClosedS.filter(
    (o) =>
      o.status !== OrderStatus.POSTPONED && o.status !== OrderStatus.QUEUE
  );
  const doneOrders = nonClosedS.filter((o) => o.status === OrderStatus.DONE);
  const stopOrders = nonClosedS.filter(
    (o) =>
      o.status === OrderStatus.STOP_PARTS || o.status === OrderStatus.STOP_PAINT
  );
  const postponedOld = nonClosedS.filter(
    (o) =>
      o.status === OrderStatus.POSTPONED &&
      new Date(o.createdAt ?? now) < postponedCutoff
  );

  // Idle cars: DONE + calcIdleDays >= threshold
  const idleCars = doneOrders
    .map((o) => ({ ...o, idleDays: calcIdleDays(o.readyDate) }))
    .filter((o) => o.idleDays >= IDLE_THRESHOLD_DAYS)
    .sort((a, b) => b.idleDays - a.idleDays);

  // Debt — конвертовані суми через aggregateDebtors (правильна валютна нормалізація)
  const eligibleForDebt = nonClosedS.filter((o) => o.status !== OrderStatus.POSTPONED);
  const { debtors, totalDebt } = aggregateDebtors(
    eligibleForDebt as unknown as Parameters<typeof aggregateDebtors>[0],
    displayCurrency,
    fallbackRate
  );

  // Week revenue — правильна нормалізація через computeOrderTotals
  const weekRevenue = recentClosedS.reduce(
    (sum, o) =>
      sum + computeOrderTotals(o as unknown as OrderForTotals, displayCurrency, fallbackRate).orderTotal,
    0
  );

  // Postponed reminders with daysSince
  const postponedReminders = postponedOld.map((o) => ({
    id: o.id,
    daysSince: Math.floor(
      (now.getTime() - new Date(o.createdAt ?? now).getTime()) /
        (1000 * 60 * 60 * 24)
    ),
    client: o.client,
    vehicle: o.vehicle,
  }));

  const shoppingNeededCount = await prisma.shoppingListItem.count({
    where: { isNeeded: true },
  });

  const webRequestsS = deepSerialize(webRequests);

  const urgentCount =
    idleCars.length +
    stopOrders.length +
    debtors.length +
    postponedReminders.length +
    webRequestsS.length;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <Greeting />
      </header>

      <div className="flex flex-col gap-5 p-4 pb-10">
        {/* ── Stat cards ─────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            href="/orders"
            icon={ClipboardList}
            value={activeOrders.length}
            label="В роботі"
            sub="активних замовлень"
            variant={activeOrders.length > 0 ? "info" : "default"}
          />
          <StatCard
            href="/orders"
            icon={ClipboardList}
            value={doneOrders.length}
            label="Готові до видачі"
            sub="DONE"
            variant={doneOrders.length > 0 ? "success" : "default"}
          />
          <StatCard
            href="/backlog"
            icon={Clock}
            value={backlogCount}
            label="В черзі"
            sub="очікують виклику"
            variant={backlogCount > 0 ? "warning" : "default"}
          />
          <StatCard
            href="/finance"
            icon={Wallet}
            value={debtors.length > 0 ? `${debtors.length}` : "0"}
            label="Боржників"
            sub={debtors.length > 0 ? formatMoney(totalDebt, displayCurrency) : "все оплачено"}
            variant={debtors.length > 0 ? "danger" : "default"}
          />
        </div>

        {/* ── Urgent section ──────────────────────────────────── */}
        {urgentCount === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center">
            <p className="text-2xl">✅</p>
            <p className="font-semibold text-green-800">Все під контролем!</p>
            <p className="text-sm text-green-600">Немає термінових питань</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50/40 p-4">
            <p className="text-sm font-bold text-amber-900">⚠️ Потребує уваги</p>
            <WebRequestsWidget orders={webRequestsS} />
            <IdleCarsList cars={idleCars} />
            <STOPSection orders={stopOrders} />
            <DebtorsList debtors={debtors} totalDebt={totalDebt} displayCurrency={displayCurrency} />
            <PostponedReminders orders={postponedReminders} />
          </div>
        )}

        {/* ── Shopping widget ─────────────────────────────────── */}
        <ShoppingNeededWidget
          items={shopping}
          totalNeeded={shoppingNeededCount}
        />

        {/* ── Recent closed ───────────────────────────────────── */}
        <RecentClosedOrders
          orders={recentClosedS as never}
          weekRevenue={weekRevenue}
          displayCurrency={displayCurrency}
        />

        {/* ── Clients stat ────────────────────────────────────── */}
        <StatCard
          href="/clients"
          icon={Users}
          value={clientCount}
          label="Клієнтів у базі"
          variant="default"
        />
      </div>
    </div>
  );
}
