import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-5xl font-bold text-muted-foreground/30">404</p>
      <h2 className="text-xl font-semibold">Сторінку не знайдено</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Схоже, цієї сторінки не існує або вона була переміщена.
      </p>
      <Button asChild>
        <Link href="/">На головну</Link>
      </Button>
    </div>
  );
}
