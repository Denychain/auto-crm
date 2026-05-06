"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PlateSearchDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plate, setPlate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = plate.replace(/\s+/g, "").toUpperCase();
    if (!normalized) return;
    setOpen(false);
    setPlate("");
    router.push(`/vehicles/${encodeURIComponent(normalized)}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Search className="size-4" />
          По номеру
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Пошук авто за номером</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            value={plate}
            onChange={(e) => setPlate(e.target.value.toUpperCase())}
            placeholder="AA1234BB"
            autoCapitalize="characters"
            autoFocus
            className="h-12 font-mono text-center text-xl tracking-widest"
          />
          <Button type="submit" disabled={!plate.trim()} className="w-full">
            Знайти
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
