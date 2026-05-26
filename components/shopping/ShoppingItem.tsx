"use client";

import { useTransition } from "react";
import { Trash2, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleShoppingItem, removeShoppingItem } from "@/app/(crm)/shopping/actions";

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

  // CRM-U01: галочка (✓) = куплено = isNeeded=false (в наявності)
  //          порожнє коло  = треба купити = isNeeded=true
  const isPurchased = !isNeeded;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 transition-colors",
        isNeeded
          ? "border-orange-200 bg-orange-50"
          : "border-green-200 bg-green-50/40"
      )}
    >
      {/* Toggle — натиснути: треба→куплено або куплено→скінчилось */}
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors disabled:opacity-50",
          isPurchased
            ? "border-green-500 bg-green-500 text-white"
            : "border-orange-400 bg-transparent hover:border-orange-500"
        )}
        aria-label={isPurchased ? "Позначити «скінчилось»" : "Позначити як куплене"}
      >
        {isPending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : isPurchased ? (
          <span className="text-xs font-bold leading-none">✓</span>
        ) : null}
      </button>

      {/* Name */}
      <span
        className={cn(
          "flex-1 text-base font-medium leading-snug",
          isNeeded ? "text-orange-900" : "text-green-900/80 line-through-none"
        )}
      >
        {name}
      </span>

      {/* «Скінчилось» label for purchased items */}
      {isPurchased && !isPending && (
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-orange-200 px-2 py-1 text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-40"
          title="Скінчилось — повернути в «Треба купити»"
        >
          <RotateCcw className="size-3" />
          Скінчилось
        </button>
      )}

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
