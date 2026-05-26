"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import { formatPlate } from "@/lib/utils";
import { formatMoney } from "@/lib/currency";
import { Currency } from "@prisma/client";
import type { WorkerGroup } from "@/lib/finance";
import { Badge } from "@/components/ui/badge";

interface WorkerPayoutsTableProps {
  groups: WorkerGroup[];
  displayCurrency?: Currency;
}

export function WorkerPayoutsTable({ groups, displayCurrency = Currency.UAH }: WorkerPayoutsTableProps) {
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

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const ownerGroups = groups.filter((g) => g.isOwner);
  const masterGroups = groups.filter((g) => !g.isOwner);

  const totalOwner = ownerGroups.reduce((s, g) => s + g.total, 0);
  const totalMasters = masterGroups.reduce((s, g) => s + g.total, 0);

  function GroupList({ list }: { list: WorkerGroup[] }) {
    return (
      <div className="overflow-hidden rounded-xl border">
        {list.map((g) => {
          const open = expanded.has(g.groupKey);
          return (
            <div key={g.groupKey} className="border-b last:border-0">
              <button
                onClick={() => toggle(g.groupKey)}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{g.workerName}</span>
                  {g.roleLabel && (
                    <Badge variant="secondary" className="text-xs">
                      {g.roleLabel}
                    </Badge>
                  )}
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs tabular-nums">
                    {g.orders.length} зам.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold tabular-nums">
                    {formatMoney(g.total, displayCurrency)}
                  </span>
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
                      key={`${o.orderId}-${g.groupKey}`}
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
                      <span className="shrink-0 font-medium tabular-nums">
                        {formatMoney(o.amount, displayCurrency)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Owner section */}
      {ownerGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">👤 Заробив власник</h2>
            <span className="text-sm font-bold tabular-nums text-emerald-700">
              {formatMoney(totalOwner, displayCurrency)}
            </span>
          </div>
          <GroupList list={ownerGroups} />
        </div>
      )}

      {/* Masters section */}
      {masterGroups.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">👷 Виплати майстрам</h2>
            <span className="text-sm font-bold tabular-nums">
              {formatMoney(totalMasters, displayCurrency)}
            </span>
          </div>
          <GroupList list={masterGroups} />
        </div>
      )}
    </div>
  );
}
