"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatMoney, formatPlate } from "@/lib/utils";
import type { WorkerGroup } from "@/lib/finance";

export function WorkerPayoutsTable({ groups }: { groups: WorkerGroup[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  if (groups.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">👷 Виплати майстрам</h2>
        <p className="text-sm text-muted-foreground">
          Немає виплат за цей період
        </p>
      </div>
    );
  }

  const totalWages = groups.reduce((s, g) => s + g.total, 0);

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">👷 Виплати майстрам</h2>
        <span className="text-sm font-bold">{formatMoney(totalWages)}</span>
      </div>

      <div className="overflow-hidden rounded-xl border">
        {groups.map((g) => {
          const open = expanded.has(g.workerName);
          return (
            <div key={g.workerName} className="border-b last:border-0">
              <button
                onClick={() => toggle(g.workerName)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{g.workerName}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                    {g.orders.length} зам.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">{formatMoney(g.total)}</span>
                  {open ? (
                    <ChevronUp className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {open && (
                <div className="border-t bg-muted/10">
                  {g.orders.map((o) => (
                    <Link
                      key={`${o.orderId}-${g.workerName}`}
                      href={`/orders/${o.orderId}`}
                      className="flex items-center justify-between px-6 py-2 text-sm hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-medium">
                          {formatPlate(o.vehiclePlate)}
                        </span>
                        <span className="ml-2 text-muted-foreground truncate">
                          {o.clientName}
                        </span>
                      </div>
                      <span className="shrink-0 font-medium">{formatMoney(o.amount)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
