import { OrderStatus, PartStatus } from "@prisma/client";

export const IDLE_THRESHOLD_DAYS = 3;
export const DREAM_FUND_PERCENT = 0.05;
export const POSTPONED_REMINDER_DAYS = 30;

export const STATUS_LABELS: Record<
  OrderStatus,
  { label: string; emoji: string; color: string }
> = {
  [OrderStatus.QUEUE]: {
    label: "Черга",
    emoji: "🟡",
    color: "bg-yellow-100 text-yellow-900",
  },
  [OrderStatus.DISASSEMBLY]: {
    label: "Розбірка",
    emoji: "🛠",
    color: "bg-orange-100 text-orange-900",
  },
  [OrderStatus.PREP]: {
    label: "Підготовка",
    emoji: "⏳",
    color: "bg-blue-100 text-blue-900",
  },
  [OrderStatus.PAINT]: {
    label: "Фарбування",
    emoji: "🎨",
    color: "bg-purple-100 text-purple-900",
  },
  [OrderStatus.ASSEMBLY]: {
    label: "Збірка",
    emoji: "🧩",
    color: "bg-indigo-100 text-indigo-900",
  },
  [OrderStatus.STOP_PARTS]: {
    label: "СТОП: запчастини",
    emoji: "⛔",
    color: "bg-red-100 text-red-900",
  },
  [OrderStatus.STOP_PAINT]: {
    label: "СТОП: фарба",
    emoji: "⛔",
    color: "bg-red-100 text-red-900",
  },
  [OrderStatus.DONE]: {
    label: "Готово",
    emoji: "✅",
    color: "bg-green-100 text-green-900",
  },
  [OrderStatus.CLOSED]: {
    label: "Закрито",
    emoji: "🏁",
    color: "bg-gray-100 text-gray-900",
  },
  [OrderStatus.POSTPONED]: {
    label: "Відкладено",
    emoji: "⏸",
    color: "bg-stone-100 text-stone-900",
  },
};

export const PART_STATUS_LABELS: Record<
  PartStatus,
  { label: string; emoji: string; color: string }
> = {
  [PartStatus.NEED_TO_BUY]: {
    label: "Треба купити",
    emoji: "🔴",
    color: "bg-red-100 text-red-900",
  },
  [PartStatus.ORDERED]: {
    label: "Замовлено",
    emoji: "🟡",
    color: "bg-yellow-100 text-yellow-900",
  },
  [PartStatus.IN_STOCK]: {
    label: "В наявності",
    emoji: "🟢",
    color: "bg-green-100 text-green-900",
  },
};
