"use client";

import { useTransition } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShoppingItem } from "./ShoppingItem";
import { markAllPurchased } from "@/app/shopping/actions";

interface Item {
  id: string;
  name: string;
  isNeeded: boolean;
}

interface ShoppingListProps {
  items: Item[];
}

export function ShoppingList({ items }: ShoppingListProps) {
  const [isPending, startTransition] = useTransition();

  const needed = items.filter((i) => i.isNeeded);
  const inStock = items.filter((i) => !i.isNeeded);

  function handleMarkAll() {
    if (!confirm("Позначити всі позиції як куплені?")) return;
    startTransition(async () => {
      await markAllPurchased();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* "Buy" section */}
      {needed.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-orange-700">
              🛒 Купити ({needed.length})
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={handleMarkAll}
              disabled={isPending}
              className="h-8 gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              {isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <CheckCheck className="size-3.5" />
              )}
              Все купив
            </Button>
          </div>
          <div className="flex flex-col gap-2">
            {needed.map((item) => (
              <ShoppingItem key={item.id} {...item} />
            ))}
          </div>
        </div>
      )}

      {/* "In stock" section */}
      {inStock.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            📦 Запас ({inStock.length})
          </h2>
          <div className="flex flex-col gap-2">
            {inStock.map((item) => (
              <ShoppingItem key={item.id} {...item} />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="py-16 text-center">
          <p className="text-4xl">🧹</p>
          <p className="mt-2 font-medium text-muted-foreground">Список порожній</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Додайте матеріали що є в наявності
          </p>
        </div>
      )}
    </div>
  );
}
