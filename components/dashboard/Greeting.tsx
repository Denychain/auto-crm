import { format } from "date-fns";
import { uk } from "date-fns/locale";

function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Доброго ранку";
  if (hour >= 12 && hour < 18) return "Доброго дня";
  if (hour >= 18 && hour < 23) return "Доброго вечора";
  return "Доброї ночі";
}

export function Greeting() {
  const now = new Date();
  const hour = now.getHours();
  const greeting = getGreeting(hour);
  const dateStr = format(now, "EEEE, d MMMM", { locale: uk });
  const capitalised = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return (
    <div>
      <p className="text-xl font-bold leading-tight">{greeting} 👋</p>
      <p className="text-sm text-muted-foreground">{capitalised}</p>
    </div>
  );
}
