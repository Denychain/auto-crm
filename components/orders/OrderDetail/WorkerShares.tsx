"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus, Loader2, AlertTriangle } from "lucide-react";
import type { WorkerShare } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatMoney, calcOrderTotal, cn } from "@/lib/utils";
import {
  addWorkerShare,
  updateWorkerShare,
  deleteWorkerShare,
  applyShareTemplate,
} from "@/app/orders/[id]/actions";
import type { FullOrder } from "@/types/orders";

// ── Single worker row ─────────────────────────────────────────────────────────

function WorkerRow({
  share,
  onDelete,
  onUpdate,
  disabled,
}: {
  share: WorkerShare;
  onDelete: (id: string) => void;
  onUpdate: (id: string, name: string, amount: number) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState(share.workerName);
  const [amount, setAmount] = useState(Number(share.amount).toFixed(2));
  const dirty = useRef(false);

  function handleBlur() {
    if (!dirty.current) return;
    dirty.current = false;
    onUpdate(share.id, name.trim() || share.workerName, parseFloat(amount) || 0);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          dirty.current = true;
        }}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder="Ім'я майстра"
        className="flex-1 text-sm"
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => {
          setAmount(e.target.value);
          dirty.current = true;
        }}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-28 text-right text-sm"
        placeholder="₴"
      />
      <button
        onClick={() => onDelete(share.id)}
        disabled={disabled}
        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        aria-label="Видалити"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// ── Add-share form ────────────────────────────────────────────────────────────

function AddShareForm({
  onAdd,
  disabled,
}: {
  onAdd: (name: string, amount: number) => void;
  disabled: boolean;
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(name.trim(), parseFloat(amount) || 0);
    setName("");
    setAmount("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 pt-1">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={disabled}
        placeholder="Ім'я майстра..."
        className="flex-1 text-sm"
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        disabled={disabled}
        placeholder="₴"
        className="w-28 text-right text-sm"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || !name.trim()}
        className="shrink-0"
        aria-label="Додати майстра"
      >
        <Plus className="size-4" />
      </Button>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WorkerSharesProps {
  orderId: string;
  initialShares: WorkerShare[];
  order: FullOrder;
}

export function WorkerShares({
  orderId,
  initialShares,
  order,
}: WorkerSharesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const orderTotal = calcOrderTotal(order.works, order.parts);
  const partsTotal = order.parts.reduce(
    (s, p) =>
      s + (p.actualPrice != null ? Number(p.actualPrice) : Number(p.estimatedPrice)),
    0
  );
  const remainderForWork = orderTotal - partsTotal;
  const distributed = initialShares.reduce((s, sh) => s + Number(sh.amount), 0);
  const diff = distributed - orderTotal;
  const overDistributed = diff > 0.01;

  function handleAdd(name: string, amount: number) {
    startTransition(async () => {
      await addWorkerShare(orderId, { workerName: name, amount });
      router.refresh();
    });
  }

  function handleDelete(shareId: string) {
    startTransition(async () => {
      await deleteWorkerShare(shareId, orderId);
      router.refresh();
    });
  }

  function handleUpdate(shareId: string, name: string, amount: number) {
    startTransition(async () => {
      await updateWorkerShare(shareId, orderId, { workerName: name, amount });
    });
  }

  function handleTemplate(template: "50/50" | "30/30/30") {
    startTransition(async () => {
      await applyShareTemplate(orderId, template);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Зарплати майстрів</CardTitle>
          {isPending && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {/* Materials + remainder info */}
        <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs">
          <div className="flex justify-between text-muted-foreground">
            <span>Сума на матеріали</span>
            <span>{formatMoney(partsTotal)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Залишок на роботу</span>
            <span>{formatMoney(remainderForWork)}</span>
          </div>
        </div>

        {/* Template buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleTemplate("50/50")}
            disabled={isPending}
            className="flex-1 rounded border border-dashed px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
          >
            50/50
          </button>
          <button
            onClick={() => handleTemplate("30/30/30")}
            disabled={isPending}
            className="flex-1 rounded border border-dashed px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
          >
            30/30/30
          </button>
        </div>

        {initialShares.length === 0 && (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Розподіл ще не заданий
          </p>
        )}
        {initialShares.map((share) => (
          <WorkerRow
            key={share.id}
            share={share}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            disabled={isPending}
          />
        ))}

        {initialShares.length > 0 && (
          <>
            <Separator />
            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                overDistributed
                  ? "bg-red-50 text-red-700"
                  : "bg-muted text-foreground"
              )}
            >
              <span className="flex items-center gap-1.5">
                {overDistributed && (
                  <AlertTriangle className="size-3.5" />
                )}
                Розподілено
              </span>
              <span>
                {formatMoney(distributed)} / {formatMoney(orderTotal)}
              </span>
            </div>
          </>
        )}

        <div className={cn("border-t pt-2", initialShares.length === 0 && "border-t-0 pt-0")}>
          <AddShareForm onAdd={handleAdd} disabled={isPending} />
        </div>
      </CardContent>
    </Card>
  );
}
