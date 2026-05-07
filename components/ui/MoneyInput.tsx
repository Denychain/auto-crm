"use client";

import { useRef, useState, useId } from "react";
import { Currency } from "@prisma/client";
import { cn } from "@/lib/utils";
import { convert } from "@/lib/currency";
import { Button } from "@/components/ui/button";

interface MoneyInputProps {
  value: number;
  currency: Currency;
  onChange: (value: number, currency: Currency) => void;
  defaultCurrency?: Currency;
  currentRate?: number; // for conversion hint
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function MoneyInput({
  value,
  currency,
  onChange,
  currentRate,
  placeholder = "0",
  disabled,
  className,
  id,
}: MoneyInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const [showHint, setShowHint] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<Currency | null>(null);

  // Format number for display: spaces as thousands separator
  function formatDisplay(n: number): string {
    if (!n) return "";
    return Math.round(n * 100) / 100 === 0
      ? ""
      : n.toFixed(2).replace(/\.00$/, "").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  function parseInput(s: string): number {
    return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;
  }

  function handleCurrencyChange(newCurrency: Currency) {
    if (newCurrency === currency) return;
    if (value > 0 && currentRate) {
      setPendingCurrency(newCurrency);
      setShowHint(true);
    } else {
      onChange(value, newCurrency);
    }
  }

  function applyConversion() {
    if (!pendingCurrency || !currentRate) return;
    const converted = convert(
      { amount: value, currency },
      pendingCurrency,
      currentRate
    );
    onChange(Math.round(converted * 100) / 100, pendingCurrency);
    setShowHint(false);
    setPendingCurrency(null);
  }

  function cancelConversion() {
    if (pendingCurrency) onChange(value, pendingCurrency);
    setShowHint(false);
    setPendingCurrency(null);
  }

  const convertedValue =
    showHint && pendingCurrency && currentRate
      ? convert({ amount: value, currency }, pendingCurrency, currentRate)
      : null;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex h-9 overflow-hidden rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          placeholder={placeholder}
          defaultValue={formatDisplay(value)}
          key={value}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const v = parseInput(e.target.value);
            onChange(v, currency);
          }}
          className="flex-1 bg-transparent px-3 py-1 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <div className="flex items-stretch border-l border-input">
          {([Currency.USD, Currency.UAH] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              disabled={disabled}
              onClick={() => handleCurrencyChange(c)}
              className={cn(
                "px-2 text-xs font-medium transition-colors",
                currency === c
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {c === Currency.USD ? "$" : "₴"}
            </button>
          ))}
        </div>
      </div>

      {showHint && convertedValue !== null && pendingCurrency && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700 dark:bg-amber-950 dark:text-amber-300">
          <span>
            Конвертувати?{" "}
            <strong>
              {currency === Currency.USD ? "$" : ""}{value}{currency === Currency.UAH ? " ₴" : ""}
            </strong>{" "}
            →{" "}
            <strong>
              {pendingCurrency === Currency.USD ? "$" : ""}
              {Math.round(convertedValue * 100) / 100}
              {pendingCurrency === Currency.UAH ? " ₴" : ""}
            </strong>
          </span>
          <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={applyConversion}>
            Так
          </Button>
          <Button size="sm" variant="ghost" className="h-5 px-1 text-xs" onClick={cancelConversion}>
            Ні
          </Button>
        </div>
      )}
    </div>
  );
}
