"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Loader2, Star } from "lucide-react";
import type { WorkerRole } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createShareTemplate,
  updateShareTemplate,
  deleteShareTemplate,
} from "@/app/(crm)/settings/share-templates/actions";
import { useRouter } from "next/navigation";

const ROLE_LABELS: Record<WorkerRole, string> = {
  PREP: "Підготовщик",
  PAINTER: "Маляр",
  POLISHER: "Полірувальник",
  OWNER: "Власник",
  OTHER: "Інше",
};
const ALL_ROLES: WorkerRole[] = ["PREP", "PAINTER", "POLISHER", "OWNER", "OTHER"];

type TemplateRule = { role: WorkerRole; percent: number };
type ShareTemplate = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  sortOrder: number;
  rules: (TemplateRule & { id: string; templateId: string })[];
};

// ── Template form dialog ──────────────────────────────────────────────────────

function TemplateDialog({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial?: ShareTemplate;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [rules, setRules] = useState<TemplateRule[]>(
    initial?.rules.map((r) => ({ role: r.role, percent: r.percent })) ?? []
  );

  const totalPercent = rules.reduce((s, r) => s + r.percent, 0);

  function addRule() {
    const unused = ALL_ROLES.find((r) => !rules.some((rule) => rule.role === r));
    if (unused) setRules((prev) => [...prev, { role: unused, percent: 0 }]);
  }

  function updateRule(idx: number, field: keyof TemplateRule, value: string | WorkerRole) {
    setRules((prev) => {
      const next = [...prev];
      if (field === "percent") next[idx] = { ...next[idx], percent: parseFloat(value as string) || 0 };
      else next[idx] = { ...next[idx], role: value as WorkerRole };
      return next;
    });
  }

  function removeRule(idx: number) {
    setRules((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || rules.length === 0) return;
    startTransition(async () => {
      if (initial) {
        await updateShareTemplate(initial.id, { name, description, isDefault, rules });
      } else {
        await createShareTemplate({ name, description, isDefault, rules });
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
            {initial ? "Редагувати шаблон" : "Новий шаблон"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Назва</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Стандарт, Складний колір..."
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Опис</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Необов'язково..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Розподіл</Label>
              <span
                className={`text-xs font-medium ${
                  Math.abs(totalPercent - 100) < 0.01
                    ? "text-green-600"
                    : "text-destructive"
                }`}
              >
                Сума: {totalPercent}%
              </span>
            </div>
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  value={rule.role}
                  onChange={(e) => updateRule(idx, "role", e.target.value as WorkerRole)}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={rule.percent}
                  onChange={(e) => updateRule(idx, "percent", e.target.value)}
                  className="w-20 text-right"
                  placeholder="%"
                />
                <span className="text-sm text-muted-foreground">%</span>
                <button
                  type="button"
                  onClick={() => removeRule(idx)}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRule}>
              <Plus className="size-3.5 mr-1" /> Додати рядок
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4"
            />
            <Label htmlFor="isDefault">За замовчуванням</Label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Скасувати
            </Button>
            <Button
              type="submit"
              disabled={isPending || !name.trim() || rules.length === 0}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : "Зберегти"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: ShareTemplate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);

  function handleDelete() {
    if (!confirm(`Видалити шаблон "${template.name}"?`)) return;
    startTransition(async () => {
      await deleteShareTemplate(template.id);
      router.refresh();
    });
  }

  return (
    <>
      <Card>
        <CardContent className="flex items-start gap-3 py-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{template.name}</span>
              {template.isDefault && (
                <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
              )}
            </div>
            {template.description && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {template.description}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {template.rules.map((r) => (
                <Badge key={r.role} variant="outline" className="text-xs gap-1">
                  {ROLE_LABELS[r.role]}
                  <span className="font-bold">{r.percent}%</span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            </button>
          </div>
        </CardContent>
      </Card>
      <TemplateDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        initial={template}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ShareTemplatesManager({ templates }: { templates: ShareTemplate[] }) {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Шаблони швидкого розподілу оплати між майстрами
        </p>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <Plus className="size-4 mr-1" />
          Новий шаблон
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Шаблонів ще немає. Запустіть seed або додайте вручну.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} />
          ))}
        </div>
      )}
      <TemplateDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}
