"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Check, X, Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import {
  createDreamFund,
  updateDreamFund,
  deleteDreamFund,
} from "@/app/(crm)/finance/actions";

interface DreamFund {
  id: string;
  goalName: string;
  targetAmount: unknown;
  currentAmount: unknown;
}

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object))
    return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

function ProgressBar({ percent }: { percent: number }) {
  const capped = Math.min(percent, 100);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full transition-all duration-500 ${capped >= 100 ? "bg-green-500" : "bg-primary"}`}
        style={{ width: `${capped}%` }}
      />
    </div>
  );
}

function FundCard({ fund }: { fund: DreamFund }) {
  const { displayCurrency } = useCurrency();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(fund.goalName);
  const [target, setTarget] = useState(String(n(fund.targetAmount)));
  const [isPending, startTransition] = useTransition();

  const current = n(fund.currentAmount);
  const goal = n(fund.targetAmount);
  const percent = goal > 0 ? (current / goal) * 100 : 0;
  const done = percent >= 100;

  function saveEdit() {
    const parsed = parseFloat(target);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    startTransition(async () => {
      await updateDreamFund(fund.id, { goalName: name, targetAmount: parsed });
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Видалити "${fund.goalName}"?`)) return;
    startTransition(async () => {
      await deleteDreamFund(fund.id);
      toast.success("Видалено");
    });
  }

  return (
    <div
      className={`rounded-xl border p-4 ${done ? "border-green-300 bg-green-50/60" : "bg-card"}`}
    >
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 flex-1"
            disabled={isPending}
            autoFocus
          />
        ) : (
          <div className="flex min-w-0 items-center gap-1.5">
            {done && <Star className="size-4 shrink-0 text-green-600" />}
            <p className="truncate font-semibold">{fund.goalName}</p>
          </div>
        )}

        <div className="flex shrink-0 gap-1">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={isPending}
                className="rounded p-1 text-green-600 hover:bg-green-100 disabled:opacity-40"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
              </button>
              <button
                onClick={() => { setEditing(false); setName(fund.goalName); setTarget(String(n(fund.targetAmount))); }}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="rounded p-1 text-muted-foreground hover:bg-muted"
              >
                <Pencil className="size-3.5" />
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
              >
                <Trash2 className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          type="number"
          min="1"
          placeholder="Ціль (₴)"
          className="mt-2 h-8"
          disabled={isPending}
        />
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        <ProgressBar percent={percent} />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{formatMoney(current, displayCurrency)}</span>
          <span className={`font-semibold ${done ? "text-green-700" : "text-muted-foreground"}`}>
            {done ? "🎉 Досягнуто!" : `${Math.round(percent)}%`}
          </span>
          <span className="text-muted-foreground">{formatMoney(goal, displayCurrency)}</span>
        </div>
      </div>

      {done && (
        <div className="mt-3 rounded-lg bg-green-100 px-3 py-2 text-center text-sm font-medium text-green-800">
          🎉 Мета досягнута — час святкувати!
        </div>
      )}
    </div>
  );
}

function NewFundDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(target);
    if (!name.trim() || isNaN(parsed) || parsed <= 0) return;
    startTransition(async () => {
      await createDreamFund(name, parsed);
      setName("");
      setTarget("");
      setOpen(false);
      toast.success("Мрію додано!");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Нова мрія
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Нова мрія</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex flex-col gap-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Назва (напр. Новий пістолет)"
            autoFocus
            disabled={isPending}
          />
          <Input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            type="number"
            min="1"
            placeholder="Ціль в ₴"
            disabled={isPending}
          />
          <Button
            type="submit"
            disabled={isPending || !name.trim() || !target}
          >
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Додати"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DreamFundWidget({ funds }: { funds: DreamFund[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">💰 Фонд розвитку</h2>
        <NewFundDialog />
      </div>

      <p className="text-xs text-muted-foreground">
        5% від кожного закритого замовлення автоматично поповнює перший активний фонд
      </p>

      {funds.length === 0 ? (
        <div className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
          Додайте першу мрію і вона почне наповнюватись автоматично
        </div>
      ) : (
        funds.map((f) => <FundCard key={f.id} fund={f} />)
      )}
    </div>
  );
}
