"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/SearchInput";
import { ClientCard } from "@/components/clients/ClientCard";
import { OrderStatus } from "@prisma/client";

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface OrderSummary {
  status: OrderStatus;
  estimatedPrice: unknown;
  advancePayment: unknown;
  totalPaid: unknown;
  works: { price: unknown }[];
  parts: { estimatedPrice: unknown; actualPrice: unknown }[];
}

interface ClientData {
  id: string;
  name: string;
  phone: string;
  note: string | null;
  vehicles: Vehicle[];
  orders: OrderSummary[];
}

interface ClientsListProps {
  clients: ClientData[];
}

export function ClientsList({ clients }: ClientsListProps) {
  const [query, setQuery] = useState("");
  const handleChange = useCallback((v: string) => setQuery(v), []);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? clients.filter((c) => {
        if (c.name.toLowerCase().includes(q)) return true;
        if (c.phone.includes(q)) return true;
        return c.vehicles.some(
          (v) =>
            v.plateNumber.toLowerCase().includes(q.replace(/\s/g, "")) ||
            `${v.make} ${v.model}`.toLowerCase().includes(q)
        );
      })
    : clients;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <SearchInput
          value={query}
          onChange={handleChange}
          placeholder="Пошук по імені, телефону, номеру авто..."
          className="flex-1"
        />
        <Button asChild size="icon" className="shrink-0">
          <Link href="/clients/new" aria-label="Новий клієнт">
            <UserPlus className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "клієнт" : "клієнтів"}
        {q && ` за запитом «${query}»`}
      </p>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Нічого не знайдено</p>
          {!q && (
            <Button asChild className="mt-4" variant="outline">
              <Link href="/clients/new">+ Додати клієнта</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((c) => (
            <ClientCard key={c.id} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}
