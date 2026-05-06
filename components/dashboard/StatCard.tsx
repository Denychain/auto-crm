import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "default" | "warning" | "danger" | "success" | "info";

const VARIANT_STYLES: Record<Variant, { card: string; bar: string }> = {
  default: { card: "bg-muted/40", bar: "bg-muted-foreground/30" },
  warning: { card: "bg-amber-50", bar: "bg-amber-400" },
  danger:  { card: "bg-red-50",   bar: "bg-red-500" },
  success: { card: "bg-green-50", bar: "bg-green-500" },
  info:    { card: "bg-blue-50",  bar: "bg-blue-400" },
};

interface StatCardProps {
  href: string;
  icon: LucideIcon;
  value: number | string;
  label: string;
  sub?: string;
  variant?: Variant;
}

export function StatCard({
  href,
  icon: Icon,
  value,
  label,
  sub,
  variant = "default",
}: StatCardProps) {
  const { card, bar } = VARIANT_STYLES[variant];

  return (
    <Link
      href={href}
      className={cn(
        "relative flex flex-col gap-2 overflow-hidden rounded-xl p-4 transition-opacity hover:opacity-80 active:scale-[0.98]",
        card
      )}
    >
      {/* Accent bar */}
      <div className={cn("absolute left-0 top-0 h-full w-1", bar)} />

      <div className="flex items-center gap-1.5 pl-2 opacity-70">
        <Icon className="size-3.5 shrink-0" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="pl-2 text-2xl font-bold leading-none tabular-nums">{value}</p>
      {sub && <p className="pl-2 text-[11px] text-muted-foreground">{sub}</p>}
    </Link>
  );
}
