"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, UserX, UserCheck, Loader2 } from "lucide-react";
import type { Worker, WorkerRole } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createWorker, updateWorker } from "@/app/(crm)/settings/team/actions";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<WorkerRole, string> = {
  PREP: "Підготовщик",
  PAINTER: "Маляр",
  POLISHER: "Полірувальник",
  OWNER: "Власник",
  OTHER: "Інше",
};

const ALL_ROLES: WorkerRole[] = ["PREP", "PAINTER", "POLISHER", "OWNER", "OTHER"];

// ── Role chip toggle ──────────────────────────────────────────────────────────

function RoleToggle({
  role,
  selected,
  onToggle,
}: {
  role: WorkerRole;
  selected: boolean;
  onToggle: (role: WorkerRole) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(role)}
      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:border-foreground/40"
      }`}
    >
      {ROLE_LABELS[role]}
    </button>
  );
}

// ── Worker form dialog ────────────────────────────────────────────────────────

function WorkerDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: Worker;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [roles, setRoles] = useState<WorkerRole[]>(
    (initial?.roles as WorkerRole[]) ?? []
  );
  const [defaultShare, setDefaultShare] = useState<string>(
    initial?.defaultShare != null ? String(initial.defaultShare) : ""
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  function toggleRole(role: WorkerRole) {
    setRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || roles.length === 0) return;

    const share = parseFloat(defaultShare);
    startTransition(async () => {
      if (initial) {
        await updateWorker(initial.id, {
          name,
          roles,
          defaultShare: isNaN(share) ? null : share,
          notes,
          isActive,
        });
      } else {
        await createWorker({
          name,
          roles,
          defaultShare: isNaN(share) ? null : share,
          notes,
        });
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Редагувати майстра" : "Додати майстра"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Ім&apos;я</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Тато, Ілля, Вася..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ролі</Label>
            <div className="flex flex-wrap gap-2">
              {ALL_ROLES.map((r) => (
                <RoleToggle
                  key={r}
                  role={r}
                  selected={roles.includes(r)}
                  onToggle={toggleRole}
                />
              ))}
            </div>
            {roles.length === 0 && (
              <p className="text-xs text-destructive">Оберіть хоча б одну роль</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Дефолтний % (необов&apos;язково)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={defaultShare}
              onChange={(e) => setDefaultShare(e.target.value)}
              placeholder="30"
            />
            <p className="text-xs text-muted-foreground">
              Пропонується при додаванні до замовлення
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Нотатка</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Необов'язково..."
            />
          </div>

          {initial && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4"
              />
              <Label htmlFor="isActive">Активний</Label>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || roles.length === 0}
            >
              {isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : initial ? (
                "Зберегти"
              ) : (
                "Додати"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Worker card ───────────────────────────────────────────────────────────────

function WorkerCard({ worker }: { worker: Worker }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function handleToggleActive() {
    startTransition(async () => {
      await updateWorker(worker.id, {
        name: worker.name,
        roles: worker.roles as WorkerRole[],
        defaultShare: worker.defaultShare as number | null,
        notes: worker.notes ?? "",
        isActive: !worker.isActive,
      });
      router.refresh();
    });
  }

  return (
    <>
      <Card className={worker.isActive ? "" : "opacity-50"}>
        <CardContent className="flex items-center gap-3 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{worker.name}</span>
              {!worker.isActive && (
                <span className="text-xs text-muted-foreground">(неактивний)</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(worker.roles as WorkerRole[]).map((r) => (
                <Badge key={r} variant="secondary" className="text-xs">
                  {ROLE_LABELS[r]}
                </Badge>
              ))}
            </div>
            {worker.defaultShare != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Дефолт: {worker.defaultShare}%
              </p>
            )}
            {worker.notes && (
              <p className="mt-0.5 text-xs text-muted-foreground truncate">
                {worker.notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Редагувати"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={handleToggleActive}
              disabled={isPending}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
              aria-label={worker.isActive ? "Деактивувати" : "Активувати"}
            >
              {worker.isActive ? (
                <UserX className="size-4" />
              ) : (
                <UserCheck className="size-4" />
              )}
            </button>
          </div>
        </CardContent>
      </Card>
      <WorkerDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={worker}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TeamManager({ workers }: { workers: Worker[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Майстри, доступні для вибору в замовленнях
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" />
          Додати майстра
        </Button>
      </div>

      {workers.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Команда ще не заповнена. Запустіть seed або додайте вручну.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {workers.map((w) => (
            <WorkerCard key={w.id} worker={w} />
          ))}
        </div>
      )}

      <WorkerDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
