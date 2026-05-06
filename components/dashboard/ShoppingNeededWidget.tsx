import Link from "next/link";
import { ShoppingCart, ArrowRight } from "lucide-react";

interface ShoppingNeededWidgetProps {
  items: { id: string; name: string }[];
  totalNeeded: number;
}

export function ShoppingNeededWidget({
  items,
  totalNeeded,
}: ShoppingNeededWidgetProps) {
  if (totalNeeded === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-orange-200 bg-orange-50 p-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-4 text-orange-600" />
        <p className="font-semibold text-orange-800">
          Треба купити: {totalNeeded}{" "}
          {totalNeeded === 1 ? "позицію" : totalNeeded < 5 ? "позиції" : "позицій"}
        </p>
      </div>

      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm text-orange-700">
            <span className="size-1.5 shrink-0 rounded-full bg-orange-500" />
            {item.name}
          </li>
        ))}
        {totalNeeded > items.length && (
          <li className="text-xs text-orange-500">
            + ще {totalNeeded - items.length}...
          </li>
        )}
      </ul>

      <Link
        href="/shopping"
        className="flex items-center gap-1 self-start text-xs font-medium text-orange-700 hover:underline"
      >
        Відкрити список <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
