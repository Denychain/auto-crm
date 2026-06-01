import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewOrderForm } from "@/components/orders/NewOrderForm";
import { prisma } from "@/lib/prisma";
import { getCurrentRate } from "@/lib/exchange-rate";
import { Currency } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const [settings, rate] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    getCurrentRate().then((r) => r.toNumber()).catch(() => null),
  ]);
  const defaultCurrency = (settings?.defaultCurrency ?? Currency.UAH) as Currency;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/orders">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Нове замовлення</h1>
      </header>

      <NewOrderForm defaultCurrency={defaultCurrency} rate={rate} />
    </div>
  );
}
