"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2 } from "lucide-react";
import type { OrderWork } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoney, cn } from "@/lib/utils";
import { addWork, updateWork, deleteWork } from "@/app/orders/[id]/actions";

// ── Row for an existing work item ─────────────────────────────────────────────

function WorkRow({
  work,
  onDelete,
  onUpdate,
  disabled,
}: {
  work: OrderWork;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, price: number) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(work.name);
  const [price, setPrice] = useState(Number(work.price).toFixed(2));
  const dirty = useRef(false);

  function markDirty() {
    dirty.current = true;
  }

  function handleBlur() {
    if (!dirty.current) return;
    dirty.current = false;
    onUpdate(work.id, name.trim() || work.name, parseFloat(price) || 0);
  }

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
      <Input
        type="number"
        min="0"
        step="0.01"
        value={price}
        onChange={(e) => {
          setPrice(e.target.value);
          markDirty();
        }}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-24 text-right text-sm"
        placeholder="0.00"
      />
      <button
        onClick={() => onDelete(work.id)}
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
}: {
  onAdd: (name: string, price: number) => void;
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
        placeholder="Нова робота..."
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
}

export function WorksConstructor({ orderId, initialWorks }: WorksConstructorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const total = initialWorks.reduce((sum, w) => sum + Number(w.price), 0);

  function handleAdd(name: string, price: number) {
    startTransition(async () => {
      await addWork(orderId, { name, price });
      router.refresh();
    });
  }

  function handleDelete(workId: string) {
    startTransition(async () => {
      await deleteWork(workId, orderId);
      router.refresh();
    });
  }

  function handleUpdate(workId: string, name: string, price: number) {
    startTransition(async () => {
      await updateWork(workId, orderId, { name, price });
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Роботи</CardTitle>
          <div className="flex items-center gap-2">
            {isPending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
            <span className="text-sm font-semibold">{formatMoney(total)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Quick-add chips */}
        <div className="flex flex-wrap gap-1.5">
          {WORK_CHIPS.map((chip) => (
            <button
              key={chip}
              onClick={() => handleAdd(chip, 0)}
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
          />
        ))}
        <div className={cn("border-t pt-2", initialWorks.length === 0 && "border-t-0 pt-0")}>
          <AddWorkForm onAdd={handleAdd} disabled={isPending} />
        </div>
      </CardContent>
    </Card>
  );
}
