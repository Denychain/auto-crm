"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { PartStatus, type OrderPart } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PART_STATUS_LABELS } from "@/lib/constants";
import { formatMoney, cn } from "@/lib/utils";
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
    }
  ) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(part.name);
  const [status, setStatus] = useState<PartStatus>(part.status);
  const [est, setEst] = useState(Number(part.estimatedPrice).toFixed(2));
  const [act, setAct] = useState(
    part.actualPrice != null ? Number(part.actualPrice).toFixed(2) : ""
  );
  const dirty = useRef(false);

  function save(overrides?: Partial<{ name: string; status: PartStatus; est: string; act: string }>) {
    const n = overrides?.name ?? name;
    const s = overrides?.status ?? status;
    const e = overrides?.est ?? est;
    const a = overrides?.act ?? act;
    onUpdate(part.id, {
      name: n.trim() || part.name,
      status: s,
      estimatedPrice: parseFloat(e) || 0,
      actualPrice: a.trim() !== "" ? parseFloat(a) || 0 : null,
    });
    dirty.current = false;
  }

  function handleStatusCycle() {
    const ns = nextStatus(status);
    setStatus(ns);
    save({ status: ns });
  }

  const { emoji, color } = PART_STATUS_LABELS[status];

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

      {/* Row 2: estimated + actual price */}
      <div className="flex items-center gap-2 pl-8">
        <label className="flex flex-1 items-center gap-1 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Кошт.:</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={est}
            onChange={(e) => {
              setEst(e.target.value);
              dirty.current = true;
            }}
            onBlur={() => dirty.current && save()}
            disabled={disabled}
            placeholder="0.00"
            className="h-7 text-right text-xs"
          />
        </label>
        <label className="flex flex-1 items-center gap-1 text-xs text-muted-foreground">
          <span className="w-12 shrink-0">Факт.:</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={act}
            onChange={(e) => {
              setAct(e.target.value);
              dirty.current = true;
            }}
            onBlur={() => dirty.current && save()}
            disabled={disabled}
            placeholder="—"
            className="h-7 text-right text-xs"
          />
        </label>
      </div>

      {/* Overbudget warning */}
      {act.trim() !== "" && parseFloat(act) > parseFloat(est || "0") && (
        <p className="pl-8 text-xs font-medium text-red-600">
          Перевитрата +{formatMoney(parseFloat(act) - (parseFloat(est) || 0))}
        </p>
      )}
    </div>
  );
}

// ── Add-part form ─────────────────────────────────────────────────────────────

function AddPartForm({
  onAdd,
  disabled,
}: {
  onAdd: (name: string, estimatedPrice: number) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), parseFloat(price) || 0);
    setName("");
    setPrice("");
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
      <Input
        type="number"
        min="0"
        step="0.01"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        disabled={disabled}
        placeholder="₴"
        className="w-24 text-right text-sm"
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

  const sumPlan = initialParts.reduce((sum, p) => sum + Number(p.estimatedPrice), 0);
  const sumActual = initialParts.reduce(
    (sum, p) =>
      sum + (p.actualPrice != null ? Number(p.actualPrice) : Number(p.estimatedPrice)),
    0
  );
  const diff = sumActual - sumPlan;

  function handleAdd(name: string, estimatedPrice: number) {
    startTransition(async () => {
      await addPart(orderId, {
        name,
        status: PartStatus.NEED_TO_BUY,
        estimatedPrice,
        actualPrice: null,
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
            <span className="text-sm font-semibold">{formatMoney(sumActual)}</span>
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
          />
        ))}
        {/* Plan/Fact summary footer */}
        {initialParts.length > 0 && (
          <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">План</span>
              <span>{formatMoney(sumPlan)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Факт</span>
              <span>{formatMoney(sumActual)}</span>
            </div>
            {diff !== 0 && (
              <div className={cn("flex justify-between font-medium", diff > 0 ? "text-red-600" : "text-green-700")}>
                <span>Різниця</span>
                <span>{diff > 0 ? `+${formatMoney(diff)}` : `-${formatMoney(Math.abs(diff))}`}</span>
              </div>
            )}
          </div>
        )}

        <div className={cn("border-t pt-2", initialParts.length === 0 && "border-t-0 pt-0")}>
          <AddPartForm onAdd={handleAdd} disabled={isPending} />
        </div>
      </CardContent>
    </Card>
  );
}
