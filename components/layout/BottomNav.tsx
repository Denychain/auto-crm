"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Users,
  Wallet,
  ShoppingCart,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Головна", icon: Home },
  { href: "/orders", label: "Замовлення", icon: ClipboardList },
  { href: "/backlog", label: "Черга", icon: Clock },
  { href: "/clients", label: "Клієнти", icon: Users },
  { href: "/finance", label: "Фінанси", icon: Wallet },
  { href: "/shopping", label: "Закупки", icon: ShoppingCart },
];

interface BottomNavProps {
  className?: string;
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background",
        "pb-safe",
        className
      )}
    >
      <div className="flex h-16 items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
