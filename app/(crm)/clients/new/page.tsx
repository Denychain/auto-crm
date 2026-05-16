import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewClientForm } from "@/components/clients/NewClientForm";

export default function NewClientPage() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-2 border-b bg-background px-2 py-2.5">
        <Button variant="ghost" size="icon" asChild className="shrink-0">
          <Link href="/clients">
            <ChevronLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="text-base font-semibold">Новий клієнт</h1>
      </header>
      <NewClientForm />
    </div>
  );
}
