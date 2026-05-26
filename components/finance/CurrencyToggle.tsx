"use client";

import { useTransition } from "react";
import { Currency } from "@prisma/client";
import { setDisplayCurrency } from "@/app/(crm)/settings/actions";
import { Loader2 } from "lucide-react";

interface CurrencyToggleProps {
  current: Currency;
}

export function CurrencyToggle({ current }: CurrencyToggleProps) {
  const [isPending, startTransition] = useTransition();
  const next = current === Currency.UAH ? Currency.USD : Currency.UAH;

  function handleToggle() {
    startTransition(async () => {
      await setDisplayCurrency(next);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-60"
      title={`Переключити на ${next}`}
    >
      {isPending ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : (
        <span className="text-base leading-none">
          {current === Currency.UAH ? "₴" : "$"}
        </span>
      )}
      <span>{current}</span>
      <span className="text-muted-foreground">↔</span>
      <span className="text-muted-foreground">{next}</span>
    </button>
  );
}
