"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;
const SHOW_AFTER_MS = 30_000;

export function InstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const until = parseInt(dismissed, 10);
      if (Date.now() < until) return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      // Show after delay
      setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setVisible(false);
    const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISS_KEY, String(until));
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") {
      setPromptEvent(null);
    }
    setVisible(false);
  }

  if (!visible || !promptEvent) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 z-50 flex items-center gap-3 rounded-xl border bg-card p-4 shadow-lg md:bottom-4 md:left-auto md:right-4 md:w-80">
      <Download className="size-5 shrink-0 text-primary" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">Встановити застосунок</p>
        <p className="text-xs text-muted-foreground">Додайте АвтоCRM на головний екран</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" onClick={install}>Встановити</Button>
        <button
          onClick={dismiss}
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          aria-label="Закрити"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
