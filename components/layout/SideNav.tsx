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
  { href: "/", label: "Головна", icon: Home },
  { href: "/orders", label: "Замовлення", icon: ClipboardList },
  { href: "/clients", label: "Клієнти", icon: Users },
  { href: "/finance", label: "Фінанси", icon: Wallet },
  { href: "/shopping", label: "Закупки", icon: ShoppingCart },
  { href: "/backlog", label: "Черга", icon: Clock },
];

interface SideNavProps {
  className?: string;
}

export function SideNav({ className }: SideNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex w-56 flex-col border-r border-border bg-sidebar",
        className
      )}
    >
      {/* Logo / app name */}
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="font-semibold text-foreground">🔧 АвтоСервіс CRM</span>
      </div>

      {/* Nav links */}
      <div className="flex flex-col gap-1 p-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/" ? pathname === "/" : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
