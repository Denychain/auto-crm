import { prisma } from "@/lib/prisma";
import { getDateRangeForPeriod, aggregateFinanceData } from "@/lib/finance";
import { PeriodSelector } from "@/components/finance/PeriodSelector";
import { FinanceSummaryCards } from "@/components/finance/FinanceSummaryCards";
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

  const [data, funds] = await Promise.all([
    aggregateFinanceData(range),
    prisma.dreamFund.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const periodLabel =
    period === "custom" && sp.from && sp.to
      ? `${sp.from} — ${sp.to}`
      : (PERIOD_LABELS[period] ?? "Місяць");

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Фінанси</h1>
      </header>

      <div className="flex flex-col gap-6 p-4 pb-10">
        <PeriodSelector current={period} from={sp.from} to={sp.to} />
        <FinanceSummaryCards data={data} periodLabel={periodLabel} />
        <DreamFundWidget funds={funds as never} />
        <RevenueBreakdown
          revenue={data.revenue}
          materials={data.materials}
          wages={data.wages}
        />
        <PlanFactTable orders={data.orderPlanFact} />
        <WorkerPayoutsTable groups={data.workerGroups} />
      </div>
    </div>
  );
}
