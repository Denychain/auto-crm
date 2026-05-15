"use client";

import { useState, useTransition } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createShoppingItem } from "@/app/shopping/actions";

const QUICK_CHIPS = [
  "Розчинник",
  "Лак",
  "Шпаклівка",
  "Ґрунтовка",
  "Малярний скотч",
  "Маски",
];

const SANDPAPER_GRITS = [80, 120, 180, 240, 320, 400, 500, 600, 800, 1000];

export function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [showGrits, setShowGrits] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await createShoppingItem(trimmed);
      setName("");
      setShowGrits(false);
      setOpen(false);
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(name);
  }

  function handleSandpaper() {
    setShowGrits(true);
    setName("Наждачка ");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setShowGrits(false); setName(""); }}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" />
          Додати позицію
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Додати до списку</DialogTitle>
        </DialogHeader>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => submit(chip)}
              disabled={isPending}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
          {/* Наждачка chip */}
          <button
            type="button"
            onClick={handleSandpaper}
            disabled={isPending}
            className="rounded-full border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
          >
            Наждачка →
          </button>
        </div>

        {/* Grit selector */}
        {showGrits && (
          <div className="flex flex-col gap-1.5 rounded-xl border bg-muted/40 p-3">
            <p className="text-xs text-muted-foreground">Оберіть зернистість або введіть вручну:</p>
            <div className="flex flex-wrap gap-1.5">
              {SANDPAPER_GRITS.map((grit) => (
                <button
                  key={grit}
                  type="button"
                  onClick={() => submit(`Наждачка ${grit}`)}
                  disabled={isPending}
                  className="rounded-lg border bg-background px-3 py-1 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {grit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom name */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Або введіть свою назву..."
            disabled={isPending}
            autoFocus={!showGrits}
          />
          <Button type="submit" size="icon" disabled={isPending || !name.trim()}>
            {isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
