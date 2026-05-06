import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewOrderForm } from "@/components/orders/NewOrderForm";

export default function NewOrderPage() {
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

      <NewOrderForm />
    </div>
  );
}
