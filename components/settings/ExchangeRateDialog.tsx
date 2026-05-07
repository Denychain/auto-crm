"use client";

import { useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import type { ExchangeRate } from "@prisma/client";

interface ExchangeRateDialogProps {
  open: boolean;
  onClose: () => void;
  currentRate: number;
  history: Pick<ExchangeRate, "date" | "usdToUah" | "source">[];
  onRefresh: () => Promise<void>;
  onSetManual: (rate: number) => Promise<void>;
}

export function ExchangeRateDialog({
  open,
  onClose,
  currentRate,
  history,
  onRefresh,
  onSetManual,
}: ExchangeRateDialogProps) {
  const [manualRate, setManualRate] = useState(String(currentRate));
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      await onRefresh();
    });
  }

  function handleManual() {
    const r = parseFloat(manualRate);
    if (!r || r <= 0) return;
    startTransition(async () => {
      await onSetManual(r);
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Курс USD → UAH</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted px-4 py-3">
            <p className="text-2xl font-bold tabular-nums">{currentRate.toFixed(4)} ₴/$</p>
            <p className="text-xs text-muted-foreground">Поточний курс</p>
          </div>

          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleRefresh}
            disabled={isPending}
          >
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
                onChange={(e) => setManualRate(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleManual} disabled={isPending}>
                Зберегти
              </Button>
            </div>
          </div>

          {history.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Останні 7 днів</p>
              <div className="rounded-lg border divide-y text-sm">
                {history.map((r) => (
                  <div
                    key={String(r.date)}
                    className="flex items-center justify-between px-3 py-1.5"
                  >
                    <span className="text-muted-foreground">
                      {format(new Date(r.date), "d MMM", { locale: uk })}
                    </span>
                    <span className="tabular-nums font-medium">
                      {Number(r.usdToUah).toFixed(2)} ₴
                    </span>
                    {r.source === "MANUAL" && (
                      <span className="text-xs text-amber-600">MANUAL</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
