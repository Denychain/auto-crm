"use client";

import { useState, useTransition, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import type { Worker, WorkerRole, ShareTemplate, ShareTemplateRule } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { calcOrderTotal, cn } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import {
  applyShareTemplate,
  addWorkerShareFromDirectory,
  updateWorkerSharePercent,
  updateWorkerShareAmount,
  removeWorkerShare,
} from "@/app/(crm)/orders/[id]/actions";
import type { FullOrder } from "@/types/orders";

// ── Types ─────────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<WorkerRole, string> = {
  PREP: "Підготовщик",
  PAINTER: "Маляр",
  POLISHER: "Полірувальник",
  OWNER: "Власник",
  OTHER: "Інше",
};

type WorkerShareFull = FullOrder["workerShares"][number];
type TemplateWithRules = ShareTemplate & { rules: ShareTemplateRule[] };

// ── Worker row ────────────────────────────────────────────────────────────────

function WorkerRow({
  share,
  base,        // залишок на людей (для перерахунку %)
  onDelete,
  onUpdatePercent,
  onUpdateAmount,
  disabled,
}: {
  share: WorkerShareFull;
  base: number;
  onDelete: (id: string) => void;
  onUpdatePercent: (id: string, pct: number) => void;
  onUpdateAmount: (id: string, amt: number) => void;
  disabled: boolean;
}) {
  const { displayCurrency } = useCurrency();
  const isPercent = share.sharePercent != null;

  // local state for the editable field
  const [localPct, setLocalPct] = useState(
    share.sharePercent != null ? String(share.sharePercent) : ""
  );
  const [localAmt, setLocalAmt] = useState(Number(share.amount).toFixed(2));
  const [usePercent, setUsePercent] = useState(isPercent);

  // computed display amount when in % mode
  const computedAmount = usePercent
    ? (base * (parseFloat(localPct) || 0)) / 100
    : parseFloat(localAmt) || 0;

  function handleBlurPct() {
    const pct = parseFloat(localPct);
    if (!isNaN(pct)) onUpdatePercent(share.id, pct);
  }

  function handleBlurAmt() {
    const amt = parseFloat(localAmt);
    if (!isNaN(amt)) onUpdateAmount(share.id, amt);
  }

  function toggleMode() {
    if (usePercent) {
      // switch to fixed amount — prefill with current computed
      setLocalAmt(computedAmount.toFixed(2));
      setUsePercent(false);
      onUpdateAmount(share.id, computedAmount);
    } else {
      // switch to %
      const pct = base > 0 ? (computedAmount / base) * 100 : 0;
      setLocalPct(pct.toFixed(1));
      setUsePercent(true);
      onUpdatePercent(share.id, pct);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Name + role */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{share.workerName}</span>
          {share.roleSnapshot && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
              {ROLE_LABELS[share.roleSnapshot as WorkerRole]}
            </Badge>
          )}
        </div>
      </div>

      {/* % / ₴ toggle button */}
      <button
        onClick={toggleMode}
        disabled={disabled}
        title={usePercent ? "Перейти до фіксованої суми" : "Перейти до %"}
        className="shrink-0 rounded border px-1.5 py-1 text-[10px] font-medium text-muted-foreground hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
      >
        {usePercent ? "%" : "₴"}
      </button>

      {/* Input field */}
      {usePercent ? (
        <div className="flex items-center gap-1 w-28">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={localPct}
            onChange={(e) => setLocalPct(e.target.value)}
            onBlur={handleBlurPct}
            disabled={disabled}
            className="w-16 text-right text-sm px-2"
            placeholder="%"
          />
          <span className="text-xs text-muted-foreground shrink-0">
            = {formatMoney(computedAmount, displayCurrency)}
          </span>
        </div>
      ) : (
        <Input
          type="number"
          min="0"
          step="0.01"
          value={localAmt}
          onChange={(e) => setLocalAmt(e.target.value)}
          onBlur={handleBlurAmt}
          disabled={disabled}
          className="w-28 text-right text-sm"
          placeholder="₴"
        />
      )}

      {/* Delete */}
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

// ── Add worker dialog ─────────────────────────────────────────────────────────

function AddWorkerDialog({
  open,
  onClose,
  orderId,
  workers,
  preselectedRole,
}: {
  open: boolean;
  onClose: () => void;
  orderId: string;
  workers: Worker[];
  preselectedRole?: WorkerRole;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkerRole | "">(
    preselectedRole ?? ""
  );
  const [usePercent, setUsePercent] = useState(true);
  const [pctValue, setPctValue] = useState("");
  const [amtValue, setAmtValue] = useState("");

  const selectedWorker = workers.find((w) => w.id === selectedWorkerId);
  const availableRoles = selectedWorker
    ? (selectedWorker.roles as WorkerRole[])
    : [];

  // When worker changes, auto-select role if only one
  function handleWorkerChange(id: string) {
    setSelectedWorkerId(id);
    const w = workers.find((w) => w.id === id);
    if (!w) return;
    const roles = w.roles as WorkerRole[];
    if (roles.length === 1) setSelectedRole(roles[0]);
    else if (preselectedRole && roles.includes(preselectedRole)) {
      setSelectedRole(preselectedRole);
    } else {
      setSelectedRole("");
    }
    // Prefill default share
    if (w.defaultShare != null) setPctValue(String(w.defaultShare));
  }

  function handleAdd() {
    if (!selectedWorkerId || !selectedRole) return;
    startTransition(async () => {
      await addWorkerShareFromDirectory(
        orderId,
        selectedWorkerId,
        selectedRole as WorkerRole,
        usePercent ? (parseFloat(pctValue) || 0) : null,
        usePercent ? null : (parseFloat(amtValue) || 0)
      );
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Додати учасника</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          {/* Worker select */}
          <div className="flex flex-col gap-1.5">
            <Label>Майстер</Label>
            <select
              value={selectedWorkerId}
              onChange={(e) => handleWorkerChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— оберіть майстра —</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role select */}
          {selectedWorker && (
            <div className="flex flex-col gap-1.5">
              <Label>Роль у замовленні</Label>
              {availableRoles.length === 1 ? (
                <div className="rounded-md border border-input bg-muted px-3 py-2 text-sm">
                  {ROLE_LABELS[availableRoles[0]]}
                </div>
              ) : (
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as WorkerRole)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— оберіть роль —</option>
                  {availableRoles.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* % / ₴ toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUsePercent(true)}
              className={`flex-1 rounded border py-1.5 text-sm transition-colors ${
                usePercent
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border text-muted-foreground"
              }`}
            >
              % від залишку
            </button>
            <button
              type="button"
              onClick={() => setUsePercent(false)}
              className={`flex-1 rounded border py-1.5 text-sm transition-colors ${
                !usePercent
                  ? "border-primary bg-primary/10 font-medium"
                  : "border-border text-muted-foreground"
              }`}
            >
              Фіксована сума
            </button>
          </div>

          {usePercent ? (
            <div className="flex flex-col gap-1.5">
              <Label>Відсоток (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={pctValue}
                onChange={(e) => setPctValue(e.target.value)}
                placeholder="30"
              />
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Сума (₴)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amtValue}
                onChange={(e) => setAmtValue(e.target.value)}
                placeholder="3000"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose} type="button">
              Скасувати
            </Button>
            <Button
              onClick={handleAdd}
              disabled={
                isPending || !selectedWorkerId || !selectedRole
              }
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Додати"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Template picker ───────────────────────────────────────────────────────────

function TemplatePicker({
  templates,
  orderId,
  existingShares,
  workers,
  disabled,
}: {
  templates: TemplateWithRules[];
  orderId: string;
  existingShares: WorkerShareFull[];
  workers: Worker[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [needWorkers, setNeedWorkers] = useState<WorkerRole[]>([]);
  const [addDialogRole, setAddDialogRole] = useState<WorkerRole | undefined>();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Перераховуємо позицію при відкритті
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: "fixed",
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  // Закрити при кліку поза
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handlePick(templateId: string) {
    setOpen(false);
    startTransition(async () => {
      const { needWorkers: missing } = await applyShareTemplate(orderId, templateId);
      router.refresh();
      if (missing.length > 0) setNeedWorkers(missing);
    });
  }

  return (
    <div>
      <button
        ref={triggerRef}
        disabled={disabled || isPending}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground disabled:opacity-40"
      >
        <span>Обрати шаблон розподілу</span>
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        )}
      </button>

      {/* Portal — рендеримо поза картою, щоб уникнути overflow-hidden */}
      {open && typeof document !== "undefined" &&
        createPortal(
          <div
            style={dropdownStyle}
            className="overflow-hidden rounded-lg border bg-popover shadow-lg"
          >
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handlePick(t.id)}
                className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-muted/60"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  {t.isDefault && (
                    <span className="rounded-full bg-primary/15 px-1.5 py-0 text-[10px] font-medium text-primary">
                      за замовч.
                    </span>
                  )}
                </div>
                {t.description && (
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                )}
                <div className="mt-1 flex gap-1">
                  {t.rules.map((r) => (
                    <span
                      key={r.id}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10px]"
                    >
                      {ROLE_LABELS[r.role as WorkerRole]} {r.percent}%
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}

      {/* Dialogs for missing roles */}
      {needWorkers.map((role) => (
        <AddWorkerDialog
          key={role}
          open={addDialogRole === role || (needWorkers[0] === role && !addDialogRole)}
          onClose={() => {
            setNeedWorkers((prev) => prev.filter((r) => r !== role));
            setAddDialogRole(undefined);
          }}
          orderId={orderId}
          workers={workers.filter((w) => (w.roles as WorkerRole[]).includes(role))}
          preselectedRole={role}
        />
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface WorkerSharesProps {
  orderId: string;
  initialShares: WorkerShareFull[];
  order: FullOrder;
  templates: TemplateWithRules[];
  workers: Worker[];
}

export function WorkerShares({
  orderId,
  initialShares,
  order,
  templates,
  workers,
}: WorkerSharesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { displayCurrency } = useCurrency();
  const [addOpen, setAddOpen] = useState(false);

  // ── финансова логіка ──
  const orderTotal = calcOrderTotal(order.works, order.parts);
  const partsTotal = order.parts.reduce(
    (s, p) =>
      s + (p.actualPrice != null ? Number(p.actualPrice) : Number(p.estimatedPrice)),
    0
  );
  const base = orderTotal - partsTotal; // залишок на людей
  const distributed = initialShares.reduce((s, sh) => s + Number(sh.amount), 0);
  const diff = distributed - base;
  const overDistributed = diff > 0.01;
  const underDistributed = diff < -0.01;

  function handleDelete(shareId: string) {
    startTransition(async () => {
      await removeWorkerShare(shareId, orderId);
      router.refresh();
    });
  }

  function handleUpdatePercent(shareId: string, pct: number) {
    startTransition(async () => {
      await updateWorkerSharePercent(shareId, orderId, pct);
      router.refresh();
    });
  }

  function handleUpdateAmount(shareId: string, amt: number) {
    startTransition(async () => {
      await updateWorkerShareAmount(shareId, orderId, amt);
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

      <CardContent className="flex flex-col gap-3">
        {/* ── Розрахунок ──────────────────────────────── */}
        <div className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs flex flex-col gap-1">
          <div className="flex justify-between text-muted-foreground">
            <span>Загальна сума замовлення</span>
            <span className="font-medium text-foreground">
              {formatMoney(orderTotal, displayCurrency)}
            </span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Матеріали (факт)</span>
            <span>−{formatMoney(partsTotal, displayCurrency)}</span>
          </div>
          <Separator className="my-1" />
          <div className="flex justify-between font-semibold text-sm">
            <span>Залишок на людей</span>
            <span>{formatMoney(base, displayCurrency)}</span>
          </div>
        </div>

        {/* ── Шаблон ───────────────────────────────────── */}
        <TemplatePicker
          templates={templates}
          orderId={orderId}
          existingShares={initialShares}
          workers={workers}
          disabled={isPending}
        />

        {/* ── Список учасників ─────────────────────────── */}
        {initialShares.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">
            Розподіл ще не заданий
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {initialShares.map((share) => (
              <WorkerRow
                key={share.id}
                share={share}
                base={base}
                onDelete={handleDelete}
                onUpdatePercent={handleUpdatePercent}
                onUpdateAmount={handleUpdateAmount}
                disabled={isPending}
              />
            ))}
          </div>
        )}

        {/* ── Валідація ─────────────────────────────────── */}
        {initialShares.length > 0 && (
          <>
            <Separator />
            <div
              className={cn(
                "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
                overDistributed
                  ? "bg-red-50 text-red-700"
                  : underDistributed
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-green-50 text-green-700"
              )}
            >
              <span className="flex items-center gap-1.5">
                {overDistributed ? (
                  <AlertTriangle className="size-3.5" />
                ) : underDistributed ? (
                  <AlertTriangle className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                {overDistributed
                  ? `Перевитрата: ${formatMoney(diff, displayCurrency)}`
                  : underDistributed
                  ? `Не розподілено: ${formatMoney(-diff, displayCurrency)}`
                  : "Розподілено"}
              </span>
              <span>
                {formatMoney(distributed, displayCurrency)} /{" "}
                {formatMoney(base, displayCurrency)}
              </span>
            </div>
          </>
        )}

        {/* ── Додати майстра ────────────────────────────── */}
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed"
          onClick={() => setAddOpen(true)}
          disabled={isPending}
        >
          <Plus className="size-4 mr-1" />
          Додати майстра
        </Button>

        <AddWorkerDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          orderId={orderId}
          workers={workers.filter((w) => w.isActive)}
        />
      </CardContent>
    </Card>
  );
}
