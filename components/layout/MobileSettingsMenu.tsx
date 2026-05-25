"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, Users, LayoutTemplate, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const SETTINGS_ITEMS = [
  {
    href: "/settings",
    label: "Налаштування",
    description: "Валюта, курс, загальні параметри",
    icon: Settings,
    exact: true,
  },
  {
    href: "/settings/team",
    label: "Команда",
    description: "Майстри, ролі, ставки",
    icon: Users,
    exact: false,
  },
  {
    href: "/settings/share-templates",
    label: "Шаблони розподілу",
    description: "Відсотки між майстрами",
    icon: LayoutTemplate,
    exact: false,
  },
] as const;

export function MobileSettingsMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Відкрити налаштування"
          className={cn(
            "flex size-9 items-center justify-center rounded-full transition-colors",
            "text-muted-foreground hover:bg-muted hover:text-foreground",
            // Підсвічуємо, якщо зараз на сторінці налаштувань
            pathname.startsWith("/settings") &&
              "bg-muted text-foreground"
          )}
        >
          <Settings className="size-5" />
        </button>
      </SheetTrigger>

      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="mb-2 text-left">
          <SheetTitle className="text-base">Налаштування</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1">
          {SETTINGS_ITEMS.map(({ href, label, description, icon: Icon, exact }) => {
            const isActive = exact
              ? pathname === href
              : pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3 transition-colors",
                  isActive
                    ? "bg-muted text-foreground"
                    : "text-foreground hover:bg-muted/60"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </span>

                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium leading-tight">
                    {label}
                  </span>
                  <span className="block text-xs text-muted-foreground leading-tight mt-0.5">
                    {description}
                  </span>
                </span>

                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
