"use client";

import { useState, useTransition, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import { Currency } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { cn } from "@/lib/utils";
import { formatMoney, convert } from "@/lib/currency";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { updateFinance } from "@/app/(crm)/orders/[id]/actions";
import type { FullOrder } from "@/types/orders";
import type { OrderTotals } from "@/lib/finance";

interface FinanceBlockProps {
  order: FullOrder;
  totals: OrderTotals;
}

export function FinanceBlock({ order, totals }: FinanceBlockProps) {
  const { displayCurrency, rate } = useCurrency();

  function fmt(amount: number) {
    return formatMoney(amount, displayCurrency);
  }

  // Валюта замовлення — спільна для ціни, завдатку та оплати
  const initialCurrency = (((order as { currency?: string }).currency) ?? Currency.UAH) as Currency;

  // Локальний стан лише для editable inputs — щоб уникнути втрати фокусу (CRM-B01)
  const [estimatedPrice, setEstimatedPrice] = useState(Number(order.estimatedPrice));
  const [advPay, setAdvPay] = useState(Number(order.advancePayment));
  const [totalPaid, setTotalPaid] = useState(Number(order.totalPaid));
  const [orderCurrency, setOrderCurrency] = useState<Currency>(initialCurrency);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(true);

  // Синхронізуємо локальний стан з пропсами при зовнішніх змінах (наприклад,
  // router.refresh() після збереження з іншого пристрою)
  useEffect(() => {
    setEstimatedPrice(Number(order.estimatedPrice));
  }, [order.estimatedPrice]);

  useEffect(() => {
    setAdvPay(Number(order.advancePayment));
  }, [order.advancePayment]);

  useEffect(() => {
    setTotalPaid(Number(order.totalPaid));
  }, [order.totalPaid]);

  useEffect(() => {
    setOrderCurrency(initialCurrency);
  }, [initialCurrency]);

  // Борг рахується в одній валюті: локальні поля (валюта замовлення) приводимо
  // до displayCurrency перед відніманням від нормалізованого orderTotal.
  const localPaid = totalPaid || 0;
  const localAdv = advPay || 0;
  const paidInDisplay = convert(
    { amount: localPaid, currency: orderCurrency },
    displayCurrency,
    rate ?? undefined
  );
  const advInDisplay = convert(
    { amount: localAdv, currency: orderCurrency },
    displayCurrency,
    rate ?? undefined
  );
  const debt = Math.max(0, totals.orderTotal - paidInDisplay - advInDisplay);

  function handleSave() {
    startTransition(async () => {
      await updateFinance(order.id, {
        totalPaid: localPaid,
        advancePayment: localAdv,
        estimatedPrice: estimatedPrice || 0,
        currency: orderCurrency,
      });
      setSaved(true);
    });
  }

  function markDirty() {
    setSaved(false);
  }

  function addToPaid(amount: number) {
    setTotalPaid((prev) => Math.round((prev + amount) * 100) / 100);
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
        {/* Орієнтовна ціна */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Орієнтовна ціна</span>
          <MoneyInput
            value={estimatedPrice}
            currency={orderCurrency}
            currentRate={rate ?? undefined}
            onChange={(v, c) => {
              setEstimatedPrice(v);
              setOrderCurrency(c);
              markDirty();
            }}
            disabled={isPending}
            className="w-36"
          />
        </div>

        <Separator className="my-1" />

        {/* Розбивка — значення з серверно-обчисленого totals */}
        <div className={cn(row, "text-muted-foreground")}>
          <span>Роботи</span>
          <span>{fmt(totals.worksTotal)}</span>
        </div>
        <div className={cn(row, "text-muted-foreground")}>
          <span>Запчастини</span>
          <span>{fmt(totals.partsActualTotal)}</span>
        </div>

        <Separator className="my-1" />

        <div className={cn(row, "font-semibold")}>
          <span>Загальна сума</span>
          <span>{fmt(totals.orderTotal)}</span>
        </div>

        <Separator className="my-1" />

        {/* Editable: завдаток */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Завдаток</span>
          <MoneyInput
            value={advPay}
            currency={orderCurrency}
            currentRate={rate ?? undefined}
            onChange={(v, c) => {
              setAdvPay(v);
              setOrderCurrency(c);
              markDirty();
            }}
            disabled={isPending}
            className="w-36"
          />
        </div>

        {/* Editable: оплачено + quick buttons */}
        <div className="flex items-center justify-between gap-2 py-1 text-sm">
          <span className="shrink-0 text-muted-foreground">Оплачено</span>
          <MoneyInput
            value={totalPaid}
            currency={orderCurrency}
            currentRate={rate ?? undefined}
            onChange={(v, c) => {
              setTotalPaid(v);
              setOrderCurrency(c);
              markDirty();
            }}
            disabled={isPending}
            className="w-36"
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
        <p className="text-center text-[10px] text-muted-foreground">
          Платіж у валюті замовлення ({orderCurrency})
        </p>

        <Separator className="my-1" />

        {/* Борг */}
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
          <span>{debt > 0.01 ? fmt(debt) : "✓"}</span>
        </div>

        {/* Кнопка збереження */}
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
