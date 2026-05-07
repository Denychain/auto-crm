"use client";

import { useState, useTransition } from "react";
import { Currency } from "@prisma/client";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { ExchangeRateDialog } from "@/components/settings/ExchangeRateDialog";
import { updateSettings, refreshRateFromNBU, setManualRate } from "@/app/settings/actions";
import { cn } from "@/lib/utils";
import type { ExchangeRate } from "@prisma/client";

interface CurrencyToggleProps {
  rateHistory?: Pick<ExchangeRate, "date" | "usdToUah" | "source">[];
  className?: string;
}

export function CurrencyToggle({ rateHistory = [], className }: CurrencyToggleProps) {
  const { displayCurrency, setDisplayCurrency, rate } = useCurrency();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = displayCurrency === Currency.USD ? Currency.UAH : Currency.USD;
    startTransition(async () => {
      setDisplayCurrency(next);
      await updateSettings({ displayCurrency: next });
    });
  }

  async function handleRefresh() {
    await refreshRateFromNBU();
  }

  async function handleSetManual(r: number) {
    await setManualRate(r);
  }

  return (
    <>
      <div className={cn("flex items-center gap-1", className)}>
        <button
          onClick={toggle}
          className="flex h-7 items-center gap-1 rounded-full bg-muted px-2.5 text-xs font-medium hover:bg-muted/80 transition-colors"
        >
          <span className={displayCurrency === Currency.USD ? "text-foreground" : "text-muted-foreground"}>$</span>
          <span className="text-muted-foreground">/</span>
          <span className={displayCurrency === Currency.UAH ? "text-foreground" : "text-muted-foreground"}>₴</span>
        </button>
        {rate && (
          <button
            onClick={() => setDialogOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors tabular-nums"
          >
            {rate.toFixed(2)}
          </button>
        )}
      </div>

      <ExchangeRateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        currentRate={rate ?? 41}
        history={rateHistory}
        onRefresh={handleRefresh}
        onSetManual={handleSetManual}
      />
    </>
  );
}
