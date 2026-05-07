"use client";

import { useState, useEffect, useCallback } from "react";
import { Currency } from "@prisma/client";

export function useExchangeRate() {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/exchange-rate");
      if (res.ok) {
        const data = (await res.json()) as { rate: number };
        setRate(data.rate);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rate, loading, refresh };
}

export function useDisplayCurrency() {
  const [currency, setCurrencyState] = useState<Currency>(Currency.USD);

  const setCurrency = useCallback(async (c: Currency) => {
    setCurrencyState(c);
    // Persisted via CurrencyProvider context / server action
  }, []);

  return { currency, setCurrency };
}
