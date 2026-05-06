# АвтоCRM

PWA-додаток для управління автосервісом (фарбування та рихтування). Розроблено як мобільний CRM для невеликого сімейного автосервісу.

## Можливості

- **Замовлення** — Kanban-дошка зі статусами: Черга → Розбір → Фарбування → Збірка → Готово → Закрито
- **Черга (Backlog)** — список клієнтів, що очікують виклику з авансовою оплатою
- **Клієнти та авто** — картки клієнтів, пошук за номером, прив'язані авто та історія замовлень
- **Фінанси** — звіти за період: виручка, матеріали, зарплати, план/факт, фонд мрії
- **Закупки** — список потрібних матеріалів з позначками
- **Dashboard** — привітання, ключові показники, авто що простоюють, боржники, нагадування

## Технічний стек

- **Next.js 16** (App Router, Server Actions, Server Components)
- **React 19**
- **Tailwind CSS v4**
- **shadcn/ui** (radix-nova preset)
- **Prisma ORM** + PostgreSQL (Neon)
- **PWA** (@ducanh2912/next-pwa, Workbox)
- **date-fns** з українською локаллю

## Локальний запуск

### 1. Встановити залежності

```bash
npm install
```

### 2. Налаштувати `.env`

Створи файл `.env` у корені проекту:

```env
# PostgreSQL рядок підключення (Neon, Supabase або локальна БД)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"

# Cloudinary (для завантаження фото авто — необов'язково)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET="your_upload_preset"
```

### 3. Ініціалізувати базу даних

```bash
npx prisma migrate dev
# Опціонально — заповнити тестовими даними:
npm run seed
```

### 4. Запустити dev-сервер

```bash
npm run dev
```

Відкрий [http://localhost:3000](http://localhost:3000).

> **Примітка:** Якщо виникає Turbopack-помилка на Windows, запусти:
> ```bash
> npm run dev -- --no-turbopack
> ```

## Деплой на Vercel + Neon

1. Зареєструйся на [neon.tech](https://neon.tech) → створи проект → скопіюй `DATABASE_URL`
2. Зареєструйся на [vercel.com](https://vercel.com) → імпортуй репозиторій з GitHub
3. У налаштуваннях проекту Vercel додай Environment Variables:
   - `DATABASE_URL` — рядок підключення Neon
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (якщо використовуєш фото)
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
4. У Vercel Settings → General → Build Command залиш `next build` (за замовчуванням)
5. Після першого деплою виконай міграцію через Vercel CLI або вручну через Neon консоль:
   ```bash
   npx prisma migrate deploy
   ```

## PWA — іконки

Поклади вихідне зображення `512×512 px` у `public/source-icon.png`, потім:

```bash
npm run icons
```

Скрипт згенерує:
- `public/icon-192.png`
- `public/icon-512.png`
- `public/apple-touch-icon.png` (180×180)
- `public/favicon.ico` (32×32)

## Встановити як PWA

На мобільному (Android/iOS):

1. Відкрий сайт у Chrome (Android) або Safari (iOS)
2. Android: з'явиться банер "Додати на головний екран" або через меню браузера → "Встановити додаток"
3. iOS: Safari → кнопка "Поділитись" → "На головний екран"

На десктопі (Chrome/Edge): значок встановлення у правій частині адресного рядка.

## Структура папок

```
auto-crm-project/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Кореневий layout з навігацією
│   ├── page.tsx              # Dashboard (головна)
│   ├── loading.tsx           # Root loading skeleton
│   ├── error.tsx             # Global error boundary
│   ├── not-found.tsx         # 404 сторінка
│   ├── orders/               # Kanban замовлень
│   ├── clients/              # Клієнти та авто
│   ├── backlog/              # Черга очікування
│   ├── finance/              # Фінансовий модуль
│   └── shopping/             # Список закупок
│
├── components/
│   ├── layout/               # SideNav, BottomNav
│   ├── orders/               # OrderCard, KanbanColumn, форми
│   ├── clients/              # ClientProfile, VehicleCard
│   ├── backlog/              # BacklogRow, CallDialog
│   ├── finance/              # DreamFundWidget, RevenueBreakdown, таблиці
│   ├── shopping/             # ShoppingList, ShoppingItem, AddItemDialog
│   ├── dashboard/            # Greeting, StatCard, IdleCarsList, DebtorsList
│   ├── ui/                   # shadcn/ui компоненти
│   ├── InstallPrompt.tsx     # PWA "Встановити" банер
│   └── OfflineBanner.tsx     # Банер офлайн-режиму
│
├── lib/
│   ├── db.ts                 # Prisma клієнт (singleton)
│   ├── finance.ts            # Агрегація фінансових даних
│   ├── templates.ts          # Шаблони SMS/Viber повідомлень
│   └── utils.ts              # cn(), форматування
│
├── prisma/
│   ├── schema.prisma         # Схема БД
│   └── seed.ts               # Тестові дані
│
├── public/
│   ├── manifest.json         # PWA маніфест
│   ├── source-icon.png       # Вихідна іконка (512×512, додати вручну)
│   └── ...                   # Згенеровані іконки
│
└── scripts/
    └── generate-icons.js     # Генератор іконок (sharp)
```
