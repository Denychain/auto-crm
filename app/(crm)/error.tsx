"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[AutoCRM error]", error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-xl font-semibold">Щось пішло не так</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Виникла неочікувана помилка. Спробуйте ще раз або поверніться на головну.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground/60">
          #{error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={() => unstable_retry()}>Спробувати ще</Button>
        <Button variant="outline" asChild>
          <a href="/dashboard">На головну</a>
        </Button>
      </div>
    </div>
  );
}
