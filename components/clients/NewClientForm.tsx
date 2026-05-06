"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/app/clients/new/actions";

export function NewClientForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [addVehicle, setAddVehicle] = useState(false);
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.error("Вкажіть ім'я та телефон");
      return;
    }
    if (addVehicle && (!plate.trim() || !make.trim() || !model.trim())) {
      toast.error("Заповніть дані авто");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createClient({
          name,
          phone,
          note: note || undefined,
          vehicle: addVehicle
            ? {
                plate: plate.replace(/\s+/g, "").toUpperCase(),
                make,
                model,
                year: year ? parseInt(year) : undefined,
              }
            : undefined,
        });
        router.push(`/clients/${result.clientId}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Помилка збереження";
        toast.error(msg);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 pb-10">
      {/* Client info */}
      <div className="flex flex-col gap-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ім'я клієнта"
          className="h-12"
          disabled={isPending}
          required
        />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+380XXXXXXXXX"
          type="tel"
          className="h-12"
          disabled={isPending}
          required
        />
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Нотатка (необов'язково)"
          rows={2}
          disabled={isPending}
        />
      </div>

      <Separator />

      {/* Toggle vehicle */}
      <button
        type="button"
        onClick={() => setAddVehicle((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <span className="flex size-5 items-center justify-center rounded-full border-2 border-primary text-xs font-bold">
          {addVehicle ? "−" : "+"}
        </span>
        Додати авто зараз
      </button>

      {addVehicle && (
        <div className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="AA1234BB"
            autoCapitalize="characters"
            className="h-12 font-mono text-center text-lg tracking-widest"
            disabled={isPending}
          />
          <div className="flex gap-2">
            <Input
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder="Марка (Toyota)"
              className="h-12 flex-1"
              disabled={isPending}
            />
            <Input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Модель (Camry)"
              className="h-12 flex-1"
              disabled={isPending}
            />
          </div>
          <Input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="Рік (необов'язково)"
            type="number"
            min="1950"
            max="2030"
            className="h-12"
            disabled={isPending}
          />
        </div>
      )}

      <Button type="submit" size="lg" className="h-12 w-full" disabled={isPending}>
        {isPending ? <Loader2 className="size-5 animate-spin" /> : "Зберегти клієнта"}
      </Button>
    </form>
  );
}
