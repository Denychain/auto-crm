"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PERIODS = [
  { value: "day", label: "Сьогодні" },
  { value: "week", label: "Тиждень" },
  { value: "month", label: "Місяць" },
  { value: "all", label: "Весь час" },
  { value: "custom", label: "Свій діапазон" },
];

interface PeriodSelectorProps {
  current: string;
  from?: string;
  to?: string;
}

export function PeriodSelector({ current, from, to }: PeriodSelectorProps) {
  const router = useRouter();
  const [fromDate, setFromDate] = useState(from ?? "");
  const [toDate, setToDate] = useState(to ?? "");

  function navigate(period: string, f?: string, t?: string) {
    const params = new URLSearchParams({ period });
    if (period === "custom" && f && t) {
      params.set("from", f);
      params.set("to", t);
    }
    router.push(`/finance?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => navigate(p.value, fromDate, toDate)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              current === p.value
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {current === "custom" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 w-40"
          />
          <span className="text-muted-foreground">—</span>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 w-40"
          />
          <Button size="sm" onClick={() => navigate("custom", fromDate, toDate)}>
            Застосувати
          </Button>
        </div>
      )}
    </div>
  );
}
