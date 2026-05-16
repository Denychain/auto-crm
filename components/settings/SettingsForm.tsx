"use client";

import { useState, useTransition } from "react";
import { Currency } from "@prisma/client";
import { RefreshCw, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { updateSettings, refreshRateFromNBU, setManualRate } from "@/app/(crm)/settings/actions";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import type { ExchangeRate } from "@prisma/client";

interface SettingsFormProps {
  displayCurrency: Currency;
  defaultCurrency: Currency;
  autoUpdateRate: boolean;
  currentRate: number;
  rateHistory: Pick<ExchangeRate, "date" | "usdToUah" | "source">[];
}

export function SettingsForm({
  displayCurrency: initialDisplay,
  defaultCurrency: initialDefault,
  autoUpdateRate: initialAutoUpdate,
  currentRate: initialRate,
  rateHistory,
}: SettingsFormProps) {
  const { setDisplayCurrency, setRate } = useCurrency();
  const [display, setDisplay] = useState<Currency>(initialDisplay);
  const [dflt, setDflt] = useState<Currency>(initialDefault);
  const [autoUpdate, setAutoUpdate] = useState(initialAutoUpdate);
  const [currentRate, setCurrentRate] = useState(initialRate);
  const [manualRate, setManualRate2] = useState(String(initialRate.toFixed(4)));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleDisplayChange(c: Currency) {
    setDisplay(c);
    setDisplayCurrency(c);
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updateSettings({ displayCurrency: display, defaultCurrency: dflt, autoUpdateRate: autoUpdate });
      setSaved(true);
    });
  }

  function handleRefresh() {
    startTransition(async () => {
      const { rate } = await refreshRateFromNBU();
      setCurrentRate(rate);
      setRate(rate);
      setManualRate2(rate.toFixed(4));
    });
  }

  function handleManualSave() {
    const r = parseFloat(manualRate);
    if (!r || r <= 0) return;
    startTransition(async () => {
      await setManualRate(r);
      setCurrentRate(r);
      setRate(r);
    });
  }

  const RadioGroup = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: Currency;
    onChange: (c: Currency) => void;
  }) => (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex gap-3">
        {([Currency.UAH, Currency.USD] as Currency[]).map((c) => (
          <label key={c} className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              checked={value === c}
              onChange={() => onChange(c)}
              className="accent-primary"
            />
            <span className="text-sm">{c === Currency.USD ? "$ USD" : "₴ UAH"}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Currency settings */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Валюта</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RadioGroup
            label="Відображати звіти в"
            value={display}
            onChange={handleDisplayChange}
          />
          <RadioGroup
            label="Вводити нові ціни в"
            value={dflt}
            onChange={setDflt}
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="accent-primary"
            />
            <span className="text-sm">Авто-оновлення курсу з НБУ щодня</span>
          </label>
          <Button onClick={handleSave} disabled={isPending} size="sm" className="self-start">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Зберегти"}
            {saved && !isPending ? " ✓" : ""}
          </Button>
        </CardContent>
      </Card>

      {/* Exchange rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Курс USD → UAH</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{currentRate.toFixed(4)} ₴/$</p>
            <p className="text-xs text-muted-foreground">Поточний курс</p>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleRefresh} disabled={isPending}>
            <RefreshCw className={`size-4 ${isPending ? "animate-spin" : ""}`} />
            Оновити з НБУ
          </Button>

          <div className="space-y-2">
            <Label>Встановити вручну</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.0001"
                min="1"
                value={manualRate}
                onChange={(e) => setManualRate2(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleManualSave} disabled={isPending}>Зберегти</Button>
            </div>
          </div>

          {rateHistory.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Останні {rateHistory.length} днів</p>
              <div className="divide-y rounded-lg border text-sm">
                {rateHistory.map((r) => (
                  <div key={String(r.date)} className="flex items-center justify-between px-3 py-1.5">
                    <span className="text-muted-foreground">
                      {format(new Date(r.date), "d MMM", { locale: uk })}
                    </span>
                    <span className="tabular-nums font-medium">{Number(r.usdToUah).toFixed(2)} ₴</span>
                    {r.source === "MANUAL" && (
                      <span className="text-xs text-amber-600">MANUAL</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
