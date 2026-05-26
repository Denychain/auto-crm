import { OrderStatus, PartStatus } from "@prisma/client";

export const CONTACTS = {
  phone: "+380992334420",
  telegram: "https://t.me/+380992334420",
  viber: "viber://chat?number=%2B380992334420",
  instagram:
    "https://www.instagram.com/nice.car.if?igsh=MTI3Y2x2OWd1ODU0dw==",
  googleMaps: "https://maps.app.goo.gl/8yUeMbnw5k14jL7w9",
  address: "вул. Максимовича, 15, Івано-Франківськ, 76000",
  addressHint:
    "Навпроти заправки ОККО — наліво, перший поворот з об'їзної.",
  hours: {
    weekdays: "10:00 — 18:00",
    saturday: "Вихідний",
    sunday: "Вихідний",
  },
  coordinates: { lat: 48.9226, lng: 24.7111 },
};

export const SITE_NAV = [
  { href: "/",         label: "Головна",     key: "home"     },
  { href: "/us-cars",  label: "Авто з США",  key: "us-cars"  },
  { href: "/gallery",  label: "Галерея",     key: "gallery"  },
  { href: "/master",   label: "Про майстра", key: "master"   },
  { href: "/contacts", label: "Контакти",    key: "contacts" },
] as const;

export type NavKey = typeof SITE_NAV[number]["key"];

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
