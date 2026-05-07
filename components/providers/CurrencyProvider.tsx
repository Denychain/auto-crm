"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { Currency } from "@prisma/client";

interface CurrencyContextValue {
  displayCurrency: Currency;
  setDisplayCurrency: (c: Currency) => void;
  rate: number | null;
  setRate: (r: number) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  displayCurrency: Currency.UAH,
  setDisplayCurrency: () => {},
  rate: null,
  setRate: () => {},
});

export function useCurrency() {
  return useContext(CurrencyContext);
}

interface CurrencyProviderProps {
  children: ReactNode;
  initialDisplayCurrency?: Currency;
  initialRate?: number | null;
}

export function CurrencyProvider({
  children,
  initialDisplayCurrency = Currency.UAH,
  initialRate = null,
}: CurrencyProviderProps) {
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>(initialDisplayCurrency);
  const [rate, setRateState] = useState<number | null>(initialRate);

  const setDisplayCurrency = useCallback((c: Currency) => {
    setDisplayCurrencyState(c);
  }, []);

  const setRate = useCallback((r: number) => {
    setRateState(r);
  }, []);

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, rate, setRate }}>
      {children}
    </CurrencyContext.Provider>
  );
}
