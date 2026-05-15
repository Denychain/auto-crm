"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2, Search, Copy, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { Currency, PartStatus, type OrderPart } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/ui/MoneyInput";
import { PART_STATUS_LABELS } from "@/lib/constants";
import { formatMoney, convert } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { addPart, updatePart, deletePart } from "@/app/orders/[id]/actions";

const STATUS_CYCLE: PartStatus[] = [
  PartStatus.NEED_TO_BUY,
  PartStatus.ORDERED,
  PartStatus.IN_STOCK,
];

function nextStatus(current: PartStatus): PartStatus {
  const idx = STATUS_CYCLE.indexOf(current);
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

// ── Single part row ───────────────────────────────────────────────────────────

function PartRow({
  part,
  onDelete,
  onUpdate,
  disabled,
  displayCurrency,
  rate,
}: {
  part: OrderPart;
  onDelete: (id: string) => void;
  onUpdate: (
    id: string,
    data: {
      name: string;
      status: PartStatus;
      estimatedPrice: number;
      actualPrice: number | null;
      currency: Currency;
      articleCode: string | null;
    }
  ) => void;
  disabled: boolean;
  displayCurrency: Currency;
  rate: number | null;
}) {
  const partCurrency = ((part as { currency?: string }).currency ?? "UAH") as Currency;
  const [name, setName] = useState(part.name);
  const [status, setStatus] = useState<PartStatus>(part.status);
  const [est, setEst] = useState(Number(part.estimatedPrice));
  const [act, setAct] = useState<number | null>(
    part.actualPrice != null ? Number(part.actualPrice) : null
  );
  const [currency, setCurrency] = useState<Currency>(partCurrency);
  const [articleCode, setArticleCode] = useState<string>(
    (part as { articleCode?: string | null }).articleCode ?? ""
  );
  const dirty = useRef(false);

  function save(overrides?: Partial<{ name: string; status: PartStatus; est: number; act: number | null; currency: Currency; articleCode: string }>) {
    const n = overrides?.name ?? name;
    const s = overrides?.status ?? status;
    const e = overrides?.est ?? est;
    const a = overrides?.act !== undefined ? overrides.act : act;
    const c = overrides?.currency ?? currency;
    const code = overrides?.articleCode !== undefined ? overrides.articleCode : articleCode;
    onUpdate(part.id, {
      name: n.trim() || part.name,
      status: s,
      estimatedPrice: e,
      actualPrice: a,
      currency: c,
      articleCode: code.trim() || null,
    });
    dirty.current = false;
  }

  async function openCatalog() {
    const code = articleCode.trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // clipboard not available — proceed anyway
    }
    window.open("https://avtopro.ua/", "_blank");
    toast.success(`Артикул "${code}" скопійовано — вставте в пошук на сайті (Ctrl+V)`);
  }

  function handleStatusCycle() {
    const ns = nextStatus(status);
    setStatus(ns);
    save({ status: ns });
  }

  const { emoji, color } = PART_STATUS_LABELS[status];

  const displayEst = convert({ amount: est, currency }, displayCurrency, rate ?? undefined);
  const displayAct = act != null ? convert({ amount: act, currency }, displayCurrency, rate ?? undefined) : null;
  const overbudget = displayAct != null && displayAct > displayEst + 0.01;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border bg-muted/20 p-2.5">
      {/* Row 1: status + name + delete */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleStatusCycle}
          disabled={disabled}
          title={PART_STATUS_LABELS[status].label}
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium transition-opacity",
            color,
            disabled && "opacity-50"
          )}
        >
          {emoji}
        </button>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            dirty.current = true;
          }}
          onBlur={() => dirty.current && save()}
          disabled={disabled}
          placeholder="Назва запчастини"
          className="flex-1 text-sm"
        />
        <button
          onClick={() => onDelete(part.id)}
          disabled={disabled}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          aria-label="Видалити"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {/* Row 2: article code + catalog search */}
      <div className="flex items-center gap-1.5 pl-8">
        <Input
          value={articleCode}
          onChange={(e) => { setArticleCode(e.target.value); dirty.current = true; }}
          onBlur={() => dirty.current && save()}
          onKeyDown={(e) => e.key === "Enter" && openCatalog()}
          disabled={disabled}
          placeholder="Артикул..."
          className="h-7 flex-1 font-mono text-xs"
        />
        <button
          type="button"
          onClick={openCatalog}
          disabled={disabled || !articleCode.trim()}
          title="Шукати в avtopro.ua"
          className="flex shrink-0 items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Search className="size-3" />
          <span>Каталог</span>
        </button>
      </div>

      {/* Row 3: currency + estimated + actual */}
      <div className="flex flex-col gap-1.5 pl-8">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Кошт.:</span>
          <MoneyInput
            value={est}
            currency={currency}
            currentRate={rate ?? undefined}
            onChange={(v, c) => {
              setEst(v);
              setCurrency(c);
              dirty.current = true;
            }}
            disabled={disabled}
            className="flex-1"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Факт.:</span>
          <MoneyInput
            value={act ?? 0}
            currency={currency}
            currentRate={rate ?? undefined}
            onChange={(v, c) => {
              setAct(v > 0 ? v : null);
              setCurrency(c);
              dirty.current = true;
            }}
            disabled={disabled}
            placeholder="—"
            className="flex-1"
          />
        </div>
        {currency !== displayCurrency && (
          <p className="text-xs text-muted-foreground">
            ≈ план {formatMoney(displayEst, displayCurrency)}
            {displayAct != null ? `, факт ${formatMoney(displayAct, displayCurrency)}` : ""}
          </p>
        )}
      </div>

      {/* Overbudget warning */}
      {overbudget && (
        <p className="pl-8 text-xs font-medium text-red-600">
          Перевитрата +{formatMoney((displayAct ?? 0) - displayEst, displayCurrency)}
        </p>
      )}
    </div>
  );
}

// ── Add-part form ─────────────────────────────────────────────────────────────

function AddPartForm({
  onAdd,
  disabled,
  defaultCurrency,
  rate,
}: {
  onAdd: (name: string, estimatedPrice: number, currency: Currency) => void;
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
        placeholder="Нова запчастина..."
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
        aria-label="Додати запчастину"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PartsChecklistProps {
  orderId: string;
  initialParts: OrderPart[];
}

export function PartsChecklist({ orderId, initialParts }: PartsChecklistProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { displayCurrency, rate } = useCurrency();

  function toDisplay(amount: number, partCurrency: Currency) {
    return convert({ amount, currency: partCurrency }, displayCurrency, rate ?? undefined);
  }

  const sumPlan = initialParts.reduce((sum, p) => {
    const pc = ((p as { currency?: string }).currency ?? "UAH") as Currency;
    return sum + toDisplay(Number(p.estimatedPrice), pc);
  }, 0);

  const sumActual = initialParts.reduce((sum, p) => {
    const pc = ((p as { currency?: string }).currency ?? "UAH") as Currency;
    const v = p.actualPrice != null ? Number(p.actualPrice) : Number(p.estimatedPrice);
    return sum + toDisplay(v, pc);
  }, 0);

  const diff = sumActual - sumPlan;

  function handleAdd(name: string, estimatedPrice: number, currency: Currency) {
    startTransition(async () => {
      await addPart(orderId, {
        name,
        status: PartStatus.NEED_TO_BUY,
        estimatedPrice,
        actualPrice: null,
        currency,
      });
      router.refresh();
    });
  }

  function handleDelete(partId: string) {
    startTransition(async () => {
      await deletePart(partId, orderId);
      router.refresh();
    });
  }

  function handleUpdate(
    partId: string,
    data: {
      name: string;
      status: PartStatus;
      estimatedPrice: number;
      actualPrice: number | null;
      currency: Currency;
      articleCode: string | null;
    }
  ) {
    startTransition(async () => {
      await updatePart(partId, orderId, data);
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Запчастини</CardTitle>
          <div className="flex items-center gap-2">
            {isPending && (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            )}
            <span className="text-sm font-semibold">{formatMoney(sumActual, displayCurrency)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {initialParts.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Поки немає запчастин
          </p>
        )}
        {initialParts.map((part) => (
          <PartRow
            key={part.id}
            part={part}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            disabled={isPending}
            displayCurrency={displayCurrency}
            rate={rate}
          />
        ))}
        {/* Plan/Fact summary footer */}
        {initialParts.length > 0 && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">План</span>
              <span>{formatMoney(sumPlan, displayCurrency)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Факт</span>
              <span>{formatMoney(sumActual, displayCurrency)}</span>
            </div>
            {Math.abs(diff) > 0.01 && (
              <div className={cn("flex justify-between font-medium", diff > 0 ? "text-red-600" : "text-green-700")}>
                <span>Різниця</span>
                <span>{diff > 0 ? `+${formatMoney(diff, displayCurrency)}` : `-${formatMoney(Math.abs(diff), displayCurrency)}`}</span>
              </div>
            )}
          </div>
        )}

        <div className={cn("border-t pt-2", initialParts.length === 0 && "border-t-0 pt-0")}>
          <AddPartForm onAdd={handleAdd} disabled={isPending} defaultCurrency={displayCurrency} rate={rate} />
        </div>
      </CardContent>
    </Card>
  );
}
