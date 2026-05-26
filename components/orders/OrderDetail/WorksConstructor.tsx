"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Currency, type OrderWork } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { formatMoney, convert } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { addWork, updateWork, deleteWork } from "@/app/(crm)/orders/[id]/actions";

// ── Row for an existing work item ─────────────────────────────────────────────

function WorkRow({
  work,
  onDelete,
  onUpdate,
  disabled,
  displayCurrency,
  rate,
}: {
  work: OrderWork;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, price: number, currency: Currency) => void;
  disabled: boolean;
  displayCurrency: Currency;
  rate: number | null;
}) {
  const workCurrency = ((work as { currency?: string }).currency ?? "UAH") as Currency;
  const [name, setName] = useState(work.name);
  const [price, setPrice] = useState(Number(work.price));
  const [currency, setCurrency] = useState<Currency>(workCurrency);
  const dirty = useRef(false);

  function markDirty() {
    dirty.current = true;
  }

  function handleBlur() {
    if (!dirty.current) return;
    dirty.current = false;
    onUpdate(work.id, name.trim() || work.name, price, currency);
  }

  const displayPrice = convert({ amount: price, currency }, displayCurrency, rate ?? undefined);

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          markDirty();
        }}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Назва роботи"
        className="flex-1 text-sm"
      />
      <MoneyInput
        value={price}
        currency={currency}
        currentRate={rate ?? undefined}
        onChange={(v, c) => {
          setPrice(v);
          setCurrency(c);
          markDirty();
        }}
        disabled={disabled}
        className="w-36"
      />
      {currency !== displayCurrency && (
        <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
          ≈{formatMoney(displayPrice, displayCurrency)}
        </span>
      )}
      <button
        onClick={() => {
          dirty.current = false;
          onDelete(work.id);
        }}
        disabled={disabled}
        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        aria-label="Видалити"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ── Add-work form ─────────────────────────────────────────────────────────────

function AddWorkForm({
  onAdd,
  disabled,
  defaultCurrency,
  rate,
}: {
  onAdd: (name: string, price: number, currency: Currency) => void;
  disabled: boolean;
  defaultCurrency: Currency;
  rate: number | null;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState(0);
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), price, currency);
    setName("");
    setPrice(0);
    setCurrency(defaultCurrency);
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        placeholder="Нова робота..."
        className="flex-1 text-sm"
      />
      <MoneyInput
        value={price}
        currency={currency}
        currentRate={rate ?? undefined}
        onChange={(v, c) => {
          setPrice(v);
          setCurrency(c);
        }}
        disabled={disabled}
        className="w-36"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !name.trim()}
        className="shrink-0"
        aria-label="Додати роботу"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

// ── Chip templates ────────────────────────────────────────────────────────────

const WORK_CHIPS = [
  "Базова робота",
  "Пайка бампера",
  "Вирівнювання алюмінію",
  "Полірування",
];

// ── Main component ────────────────────────────────────────────────────────────

interface WorksConstructorProps {
  orderId: string;
  initialWorks: OrderWork[];
  /** Серверно-обчислена сума робіт з правильною нормалізацією валюти */
  worksTotal: number;
}

export function WorksConstructor({ orderId, initialWorks, worksTotal }: WorksConstructorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { displayCurrency, rate } = useCurrency();

  function handleAdd(name: string, price: number, currency: Currency) {
    startTransition(async () => {
      await addWork(orderId, { name, price, currency });
      router.refresh();
    });
  }

  function handleDelete(workId: string) {
    startTransition(async () => {
      await deleteWork(workId, orderId);
      router.refresh();
    });
  }

  function handleUpdate(workId: string, name: string, price: number, currency: Currency) {
    startTransition(async () => {
      await updateWork(workId, orderId, { name, price, currency });
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Роботи</CardTitle>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <span className="text-sm font-semibold">{formatMoney(worksTotal, displayCurrency)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Quick-add chips */}
        <div className="flex flex-wrap gap-1.5">
          {WORK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleAdd(chip, 0, displayCurrency)}
              disabled={isPending}
              className="rounded-full border border-dashed px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
            >
              + {chip}
            </button>
          ))}
        </div>

        {initialWorks.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Поки немає жодної роботи
          </p>
        )}
        {initialWorks.map((work) => (
          <WorkRow
            key={work.id}
            work={work}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            disabled={isPending}
            displayCurrency={displayCurrency}
            rate={rate}
          />
        ))}
        <div className={cn("border-t pt-2", initialWorks.length === 0 && "border-t-0 pt-0")}>
          <AddWorkForm onAdd={handleAdd} disabled={isPending} defaultCurrency={displayCurrency} rate={rate} />
        </div>
      </CardContent>
    </Card>
  );
}
