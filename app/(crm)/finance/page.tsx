import { prisma } from "@/lib/prisma";
import {
  getDateRangeForPeriod,
  aggregateClosedPeriod,
  aggregateActiveDebt,
  buildPlanFactRows,
  buildWorkerGroups,
  toN,
  type OrderForFinance,
} from "@/lib/finance";
import { OrderStatus, Currency } from "@prisma/client";
import { deepSerialize } from "@/lib/serialize";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { CurrencyToggle } from "@/components/finance/CurrencyToggle";
import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
import { ActiveDebtBanner } from "@/components/finance/ActiveDebtBanner";
import { DreamFundWidget } from "@/components/finance/DreamFundWidget";
import { PlanFactTable } from "@/components/finance/PlanFactTable";
import { WorkerPayoutsTable } from "@/components/finance/WorkerPayoutsTable";
import { RevenueBreakdown } from "@/components/finance/RevenueBreakdown";

export const dynamic = "force-dynamic";

const PERIOD_LABELS: Record<string, string> = {
  day: "Сьогодні",
  week: "Тиждень",
  month: "Місяць",
  all: "Весь час",
  custom: "Свій діапазон",
};

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const period = sp.period ?? "month";
  const range = getDateRangeForPeriod(period, sp.from, sp.to);

  // ── Паралельні запити ─────────────────────────────────────────────────────
  const [closedOrders, activeOrders, funds, settings, latestRate] = await Promise.all([
    // Закриті замовлення за період (фільтр по closedAt, fallback на updatedAt для legacy)
    prisma.order.findMany({
      where: {
        status: OrderStatus.CLOSED,
        OR: [
          { closedAt: { gte: range.from, lte: range.to } },
          { closedAt: null, updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      include: {
        client: { select: { name: true, phone: true } },
        vehicle: { select: { plateNumber: true, make: true, model: true } },
        works: { select: { price: true, currency: true, exchangeRate: true } },
        parts: {
          select: {
            estimatedPrice: true,
            actualPrice: true,
            currency: true,
            exchangeRate: true,
          },
        },
        workerShares: {
          select: {
            amount: true,
            currency: true,
            exchangeRate: true,
            roleSnapshot: true,
            workerId: true,
            workerName: true,
          },
        },
      },
    }),
    // Активні замовлення (без CLOSED і POSTPONED) — для боргів
    prisma.order.findMany({
      where: {
        status: { notIn: [OrderStatus.CLOSED, OrderStatus.POSTPONED] },
      },
      select: {
        id: true,
        status: true,
        currency: true,
        baseExchangeRate: true,
        advancePayment: true,
        totalPaid: true,
        works: { select: { price: true, currency: true, exchangeRate: true } },
        parts: {
          select: {
            estimatedPrice: true,
            actualPrice: true,
            currency: true,
            exchangeRate: true,
          },
        },
      },
    }),
    prisma.dreamFund.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } }),
  ]);

  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;
  const fallbackRate = toN(latestRate?.usdToUah) || 41;
  const ctx = { displayCurrency, fallbackRate };

  // Серіалізуємо (Decimal → number) і запускаємо чисті агрегати
  const closedS = deepSerialize(closedOrders) as unknown as OrderForFinance[];
  const activeS = deepSerialize(activeOrders) as unknown as Array<OrderForFinance & { status: string }>;

  const [periodData, debtData, planFactRows, workerGroups] = [
    aggregateClosedPeriod(closedS, ctx),
    aggregateActiveDebt(activeS, ctx),
    buildPlanFactRows(closedS, ctx),
    buildWorkerGroups(closedS, ctx),
  ];

  const periodLabel =
    period === "custom" && sp.from && sp.to
      ? `${sp.from} — ${sp.to}`
      : (PERIOD_LABELS[period] ?? "Місяць");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">Фінанси</h1>
          <CurrencyToggle current={displayCurrency} />
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4 pb-10">
        {/* Вибір periodу */}
        <PeriodSelector current={period} from={sp.from} to={sp.to} />

        {/* 6 карток-сум */}
        <FinanceSummaryCards
          revenue={periodData.revenue}
          materials={periodData.materials}
          wagesMasters={periodData.wagesMasters}
          wagesOwner={periodData.wagesOwner}
          dreamFundContribution={periodData.dreamFundContribution}
          unallocated={periodData.unallocated}
          periodLabel={periodLabel}
          displayCurrency={displayCurrency}
        />

        {/* Stacked bar: 5 сегментів */}
        <RevenueBreakdown
          revenue={periodData.revenue}
          materials={periodData.materials}
          wagesMasters={periodData.wagesMasters}
          wagesOwner={periodData.wagesOwner}
          dreamFundContribution={periodData.dreamFundContribution}
          unallocated={periodData.unallocated}
          displayCurrency={displayCurrency}
        />

        {/* Активна заборгованість (не залежить від periodу) */}
        <ActiveDebtBanner
          totalDebt={debtData.totalDebt}
          debtorsCount={debtData.debtorsCount}
          displayCurrency={displayCurrency}
        />

        {/* Фонд мрії */}
        <DreamFundWidget funds={deepSerialize(funds) as never} />

        {/* План/Факт матеріалів */}
        <PlanFactTable orders={planFactRows} displayCurrency={displayCurrency} />

        {/* Виплати (власник + майстри окремо) */}
        <WorkerPayoutsTable groups={workerGroups} displayCurrency={displayCurrency} />
      </div>
    </div>
  );
}
