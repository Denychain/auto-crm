"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleShoppingItem, removeShoppingItem } from "@/app/shopping/actions";

interface ShoppingItemProps {
  id: string;
  name: string;
  isNeeded: boolean;
}

export function ShoppingItem({ id, name, isNeeded }: ShoppingItemProps) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleShoppingItem(id);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      await removeShoppingItem(id);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 transition-colors",
        isNeeded
          ? "border-orange-300 bg-orange-50"
          : "border-border bg-card"
      )}
    >
      {/* Toggle */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
          isNeeded
            ? "border-orange-500 bg-orange-500 text-white"
            : "border-muted-foreground/40 hover:border-orange-400"
        )}
        aria-label={isNeeded ? "Позначити як куплене" : "Позначити як потрібне"}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isNeeded ? (
          <span className="text-xs font-bold leading-none">✓</span>
        ) : null}
      </button>

      {/* Name */}
      <span
        className={cn(
          "flex-1 text-base font-medium leading-snug",
          isNeeded ? "text-orange-900" : "text-foreground"
        )}
      >
        {name}
      </span>

      {/* Delete */}
      <button
        onClick={handleRemove}
        disabled={isPending}
        className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
        aria-label="Видалити"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
