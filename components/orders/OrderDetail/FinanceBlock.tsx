"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { calcOrderTotal, formatMoney, cn } from "@/lib/utils";
import { updateFinance } from "@/app/orders/[id]/actions";
import type { FullOrder } from "@/types/orders";

interface FinanceBlockProps {
  order: FullOrder;
}

export function FinanceBlock({ order }: FinanceBlockProps) {
  const [estimatedPrice, setEstimatedPrice] = useState(
    Number(order.estimatedPrice).toFixed(2)
  );
  const [advPay, setAdvPay] = useState(Number(order.advancePayment).toFixed(2));
  const [totalPaid, setTotalPaid] = useState(Number(order.totalPaid).toFixed(2));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);

  const worksTotal = order.works.reduce((s, w) => s + Number(w.price), 0);
  const partsTotal = order.parts.reduce(
    (s, p) =>
      s + (p.actualPrice != null ? Number(p.actualPrice) : Number(p.estimatedPrice)),
    0
  );
  const orderTotal = calcOrderTotal(order.works, order.parts);
  const paidNum = parseFloat(totalPaid) || 0;
  const advNum = parseFloat(advPay) || 0;
  const debt = orderTotal - paidNum - advNum;

  function handleSave() {
    startTransition(async () => {
      await updateFinance(order.id, {
        totalPaid: paidNum,
        advancePayment: advNum,
        estimatedPrice: parseFloat(estimatedPrice) || 0,
      });
      setSaved(true);
    });
  }

  function markDirty() {
    setSaved(false);
  }

  function addToPaid(amount: number) {
    const next = (paidNum + amount).toFixed(2);
    setTotalPaid(next);
    markDirty();
  }

  const row = "flex items-center justify-between text-sm py-1";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Фінанси</CardTitle>
          {isPending && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {/* Oriyentovna tsina */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Орієнтовна ціна</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={estimatedPrice}
            onChange={(e) => {
              setEstimatedPrice(e.target.value);
              markDirty();
            }}
            disabled={isPending}
            className="w-28 text-right text-sm"
          />
        </div>

        <Separator className="my-1" />

        {/* Breakdown */}
        <div className={cn(row, "text-muted-foreground")}>
          <span>Роботи</span>
          <span>{formatMoney(worksTotal)}</span>
        </div>
        <div className={cn(row, "text-muted-foreground")}>
          <span>Запчастини</span>
          <span>{formatMoney(partsTotal)}</span>
        </div>

        <Separator className="my-1" />

        <div className={cn(row, "font-semibold")}>
          <span>Загальна сума</span>
          <span>{formatMoney(orderTotal)}</span>
        </div>

        <Separator className="my-1" />

        {/* Editable: advance */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Завдаток</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={advPay}
            onChange={(e) => {
              setAdvPay(e.target.value);
              markDirty();
            }}
            disabled={isPending}
            className="w-28 text-right text-sm"
          />
        </div>

        {/* Editable: total paid + quick buttons */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Оплачено</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={totalPaid}
            onChange={(e) => {
              setTotalPaid(e.target.value);
              markDirty();
            }}
            disabled={isPending}
            className="w-28 text-right text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {[100, 500, 1000].map((amt) => (
            <button
              key={amt}
              onClick={() => addToPaid(amt)}
              disabled={isPending}
              className="flex-1 rounded border border-dashed px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
            >
              +{amt}
            </button>
          ))}
        </div>

        <Separator className="my-1" />

        {/* Debt */}
        <div
          className={cn(
            row,
            "rounded-lg px-3 py-2 font-bold text-base",
            debt > 0.01
              ? "bg-red-50 text-red-700"
              : "bg-green-50 text-green-700"
          )}
        >
          <span>{debt > 0.01 ? "До оплати" : "Повністю сплачено"}</span>
          <span>{debt > 0.01 ? formatMoney(debt) : "✓"}</span>
        </div>

        {/* Save button */}
        {!saved && (
          <Button
            onClick={handleSave}
            disabled={isPending}
            size="sm"
            className="mt-2 w-full"
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Save className="size-4" />
                Зберегти
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
