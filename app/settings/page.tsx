import { prisma } from "@/lib/prisma";
import { Currency } from "@prisma/client";
import { getCurrentRate } from "@/lib/exchange-rate";
import { CurrencyToggle } from "@/components/ui/CurrencyToggle";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Settings } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, rate, rateHistory] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    getCurrentRate().then((r) => r.toNumber()).catch(() => 41),
    prisma.exchangeRate.findMany({
      orderBy: { date: "desc" },
      take: 7,
      select: { date: true, usdToUah: true, source: true },
    }),
  ]);

  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;
  const defaultCurrency = (settings?.defaultCurrency ?? Currency.UAH) as Currency;
  const autoUpdateRate = settings?.autoUpdateRate ?? true;

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="size-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Налаштування</h1>
          </div>
          <CurrencyToggle rateHistory={rateHistory as never} />
        </div>
      </header>

      <div className="flex flex-col gap-6 p-4 pb-10">
        <SettingsForm
          displayCurrency={displayCurrency}
          defaultCurrency={defaultCurrency}
          autoUpdateRate={autoUpdateRate}
          currentRate={rate}
          rateHistory={rateHistory as never}
        />
      </div>
    </div>
  );
}
