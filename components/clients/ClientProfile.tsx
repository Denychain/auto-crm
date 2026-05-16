"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Check, X, Trash2, PlusCircle, Loader2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { toast } from "sonner";
import { OrderStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/orders/StatusBadge";
import { formatPlate, calcOrderTotal } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { useCurrency } from "@/components/providers/CurrencyProvider";
import { viberLink, telegramLink, smsLink } from "@/lib/messenger";
import {
  updateClientNote,
  addVehicle,
  removeVehicle,
  deleteClient,
} from "@/app/(crm)/clients/[id]/actions";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in (v as object)) return (v as { toNumber(): number }).toNumber();
  return Number(v);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  year: number | null;
}

interface OrderItem {
  id: string;
  status: OrderStatus;
  description: string | null;
  estimatedPrice: unknown;
  advancePayment: unknown;
  totalPaid: unknown;
  createdAt: Date;
  vehicle: { plateNumber: string; make: string; model: string };
  works: { price: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown }[];
}

interface ClientProfileProps {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  vehicles: Vehicle[];
  orders: OrderItem[];
}

// ── Inline note editor ────────────────────────────────────────────────────────

function NoteEditor({ clientId, initial }: { clientId: string; initial: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateClientNote(clientId, value);
      setEditing(false);
    });
  }

  function cancel() {
    setValue(initial ?? "");
    setEditing(false);
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex w-full items-start gap-2 rounded-lg border border-dashed p-3 text-left hover:bg-muted/30"
      >
        <Pencil className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        <span className={value ? "text-sm" : "text-sm text-muted-foreground"}>
          {value || "Додати нотатку..."}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={3}
        autoFocus
        disabled={isPending}
        placeholder="Нотатка про клієнта..."
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={isPending} className="flex-1">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <><Check className="size-4" /> Зберегти</>}
        </Button>
        <Button size="sm" variant="outline" onClick={cancel} disabled={isPending}>
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Add vehicle form ──────────────────────────────────────────────────────────

function AddVehicleForm({ clientId }: { clientId: string }) {
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!plate.trim() || !make.trim() || !model.trim()) return;
    startTransition(async () => {
      await addVehicle(clientId, {
        plate: plate.replace(/\s+/g, "").toUpperCase(),
        make,
        model,
        year: year ? parseInt(year) : undefined,
      });
      setPlate(""); setMake(""); setModel(""); setYear("");
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-3 text-sm text-muted-foreground hover:bg-muted/30"
      >
        <PlusCircle className="size-4" />
        Додати авто
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3">
      <Input
        value={plate}
        onChange={(e) => setPlate(e.target.value.toUpperCase())}
        placeholder="AA1234BB"
        className="h-10 font-mono text-center tracking-widest"
        disabled={isPending}
      />
      <div className="flex gap-2">
        <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Марка" className="h-10 flex-1" disabled={isPending} />
        <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Модель" className="h-10 flex-1" disabled={isPending} />
      </div>
      <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="Рік (опц.)" type="number" className="h-10" disabled={isPending} />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending || !plate || !make || !model} className="flex-1">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Зберегти"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>Скасувати</Button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ClientProfile({ id, name, phone, note, vehicles, orders }: ClientProfileProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const { displayCurrency } = useCurrency();

  const viberHref = viberLink(phone, `Доброго дня, ${name}!`);
  const tgHref = telegramLink(`Доброго дня, ${name}!`);
  const smsHref = smsLink(phone, `Доброго дня, ${name}!`);

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === "active") return o.status !== OrderStatus.CLOSED && o.status !== OrderStatus.POSTPONED;
    if (statusFilter === "closed") return o.status === OrderStatus.CLOSED;
    return true;
  });

  const totalDebt = orders.reduce((sum, o) => {
    if (o.status === OrderStatus.CLOSED) return sum;
    const total = calcOrderTotal(
      o.works.map((w) => ({ price: n(w.price) })),
      o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
    );
    const debt = total - n(o.totalPaid) - n(o.advancePayment);
    return sum + (debt > 0.01 ? debt : 0);
  }, 0);

  function handleDelete() {
    if (!confirm(`Видалити клієнта ${name}? Цю дію не можна скасувати.`)) return;
    startTransition(async () => {
      const res = await deleteClient(id);
      if (res.error) { toast.error(res.error); return; }
      router.push("/clients");
    });
  }

  function handleRemoveVehicle(vehicleId: string) {
    startTransition(async () => {
      const res = await removeVehicle(vehicleId, id);
      if (res.error) toast.error(res.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold leading-tight">{name}</h2>
            <a href={`tel:${phone}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              {phone}
            </a>
          </div>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            aria-label="Видалити клієнта"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {/* Messenger buttons */}
        <div className="flex gap-2">
          <a href={`tel:${phone}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted">
            📞 Дзвінок
          </a>
          <a href={viberHref}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-violet-700 hover:bg-violet-50">
            Viber
          </a>
          <a href={tgHref} target="_blank" rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium text-sky-600 hover:bg-sky-50">
            Telegram
          </a>
          <a href={smsHref}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium hover:bg-muted">
            SMS
          </a>
        </div>

        {/* Note */}
        <NoteEditor clientId={id} initial={note} />
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="vehicles">
        <TabsList className="w-full">
          <TabsTrigger value="vehicles" className="flex-1">
            Авто ({vehicles.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-1">
            Замовлення ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="finance" className="flex-1">
            Фінанси
          </TabsTrigger>
        </TabsList>

        {/* ── Авто tab ──────────────────────────────────────────────────── */}
        <TabsContent value="vehicles" className="mt-4 flex flex-col gap-3">
          {vehicles.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border p-3">
              <Link href={`/vehicles/${v.plateNumber}`} className="flex flex-1 flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold tracking-wide">
                    {formatPlate(v.plateNumber)}
                  </span>
                  <ExternalLink className="size-3 text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">
                  {v.make} {v.model}{v.year ? `, ${v.year}` : ""}
                </span>
              </Link>
              <button
                onClick={() => handleRemoveVehicle(v.id)}
                disabled={isPending}
                className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                aria-label="Видалити авто"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <AddVehicleForm clientId={id} />
        </TabsContent>

        {/* ── Замовлення tab ────────────────────────────────────────────── */}
        <TabsContent value="orders" className="mt-4 flex flex-col gap-3">
          {/* Status filter */}
          <div className="flex gap-2">
            {(["all", "active", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${
                  statusFilter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                {f === "all" ? "Всі" : f === "active" ? "Активні" : "Закриті"}
              </button>
            ))}
          </div>

          {filteredOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Немає замовлень</p>
          ) : (
            filteredOrders.map((o) => {
              const total = calcOrderTotal(
                o.works.map((w) => ({ price: n(w.price) })),
                o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
              );
              return (
                <Link
                  key={o.id}
                  href={`/orders/${o.id}`}
                  className="flex flex-col gap-2 rounded-xl border p-3 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        {format(o.createdAt, "d MMM yyyy", { locale: uk })} ·{" "}
                        <span className="font-mono">{formatPlate(o.vehicle.plateNumber)}</span>
                      </p>
                      {o.description && (
                        <p className="mt-0.5 line-clamp-2 text-sm font-medium">{o.description}</p>
                      )}
                    </div>
                    {total > 0 && <span className="shrink-0 text-sm font-bold">{formatMoney(total, displayCurrency)}</span>}
                  </div>
                  <StatusBadge status={o.status} />
                </Link>
              );
            })
          )}
        </TabsContent>

        {/* ── Фінанси tab ───────────────────────────────────────────────── */}
        <TabsContent value="finance" className="mt-4 flex flex-col gap-3">
          {/* Summary */}
          <div className={`rounded-xl px-4 py-3 ${totalDebt > 0.01 ? "bg-red-50" : "bg-green-50"}`}>
            <p className={`text-sm font-medium ${totalDebt > 0.01 ? "text-red-700" : "text-green-700"}`}>
              {totalDebt > 0.01 ? "Загальний борг" : "Заборгованості немає"}
            </p>
            {totalDebt > 0.01 && (
              <p className="text-2xl font-bold text-red-700">{formatMoney(totalDebt, displayCurrency)}</p>
            )}
          </div>

          {/* Debt orders */}
          {orders
            .filter((o) => {
              if (o.status === OrderStatus.CLOSED) return false;
              const total = calcOrderTotal(
                o.works.map((w) => ({ price: n(w.price) })),
                o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
              );
              return total - n(o.totalPaid) - n(o.advancePayment) > 0.01;
            })
            .map((o) => {
              const total = calcOrderTotal(
                o.works.map((w) => ({ price: n(w.price) })),
                o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
              );
              const debt = total - n(o.totalPaid) - n(o.advancePayment);
              return (
                <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center justify-between rounded-xl border p-3 hover:bg-muted/30">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {format(o.createdAt, "d MMM yyyy", { locale: uk })}
                    </p>
                    <p className="text-sm font-medium line-clamp-1">{o.description ?? "Замовлення"}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">{formatMoney(debt, displayCurrency)}</span>
                </Link>
              );
            })}

          {/* Full history totals */}
          <Separator />
          <div className="flex flex-col gap-2 text-sm">
            {(() => {
              const closedTotal = orders
                .filter((o) => o.status === OrderStatus.CLOSED)
                .reduce((sum, o) => {
                  return sum + calcOrderTotal(
                    o.works.map((w) => ({ price: n(w.price) })),
                    o.parts.map((p) => ({ estimatedPrice: n(p.estimatedPrice), actualPrice: p.actualPrice != null ? n(p.actualPrice) : null }))
                  );
                }, 0);
              return (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Закритих замовлень</span>
                    <span>{orders.filter((o) => o.status === OrderStatus.CLOSED).length}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Сплачено за весь час</span>
                    <span>{formatMoney(closedTotal, displayCurrency)}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      <Separator />

      {/* Quick new order */}
      <Button asChild size="lg" className="h-12 w-full">
        <Link href={`/orders/new?phone=${encodeURIComponent(phone)}`}>
          + Нове замовлення
        </Link>
      </Button>
    </div>
  );
}
