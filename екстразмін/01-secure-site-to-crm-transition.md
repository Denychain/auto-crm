# Екстра-зміна #01 — Безпечний перехід з лендингу в CRM

**Дата:** 2026-05-26
**Статус:** Запланована (не реалізована)
**Контекст:** Сайт-візитка (`app/(site)`) і CRM (`app/(crm)`) живуть на одному домені.
Потрібно забезпечити швидкий, але захищений перехід у закриту зону, щоб
дані клієнтів, замовлень і фінансів не міг подивитися сторонній.

---

## 1. Опис проблеми

Зараз у `prisma/schema.prisma` немає жодної моделі користувача чи сесії.
CRM-сторінки (`/dashboard`, `/orders`, `/clients`, `/finance`, `/backlog`,
`/shopping`, `/vehicles`, `/settings`) технічно доступні будь-кому, хто
вгадає або дізнається URL. Server actions (`actions.ts`) також не мають
жодної перевірки — їх можна викликати напряму POST-запитом і отримати
або змінити дані в базі.

Це критична проблема для дипломної роботи, бо в БД зберігаються:
- персональні дані клієнтів (імʼя, телефон, нотатки),
- історія їх авто (номерні знаки, марка/модель),
- фінансова інформація (ціни, завдатки, розподіл зарплат майстрам),
- фото-архів замовлень.

## 2. Цільова архітектура (трирівневий захист)

### Рівень 1 — Edge Middleware
Файл `middleware.ts` у корені проєкту. Виконується **до** рендеру
сторінки на Edge-рантаймі Next.js (~10-30 мс). Якщо URL веде в CRM-зону
і немає валідного session-cookie — миттєвий редирект на `/login`.
Жоден компонент layout не рендериться, жодного запиту до Prisma не
відбувається.

### Рівень 2 — Перевірка в server actions
У кожному `actions.ts` (зараз їх ~10: `orders/actions.ts`, `clients/[id]/actions.ts`,
`clients/new/actions.ts`, `orders/new/actions.ts`, `orders/[id]/actions.ts`,
`backlog/actions.ts`, `finance/actions.ts`, `shopping/actions.ts`,
`settings/actions.ts`, `settings/team/actions.ts`, `settings/share-templates/actions.ts`)
першим рядком викликається `await requireAuth()` з `lib/auth.ts`. Без цього
зловмисник обійшов би middleware і викликав action напряму.

### Рівень 3 — Layout CRM
У `app/(crm)/layout.tsx` додається `const user = await getCurrentUser()`,
і якщо `null` — `redirect("/login")`. Підстраховка на випадок, якщо
один з попередніх кроків забули в новій сторінці.

## 3. Зміни в моделі даних (Prisma)

Додати дві моделі і звʼязати з існуючою `Worker`:

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  workerId     String?  @unique
  worker       Worker?  @relation(fields: [workerId], references: [id])
  sessions     Session[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}
```

`User.workerId` звʼязує запис логіну з конкретним майстром у системі —
це чисто і не дублює дані.

## 4. Технологічний стек для автентифікації

Рекомендований варіант — **Auth.js (NextAuth v5)** з Credentials provider
+ Prisma adapter + `bcrypt` для паролів. Аргументи на захисті:
- індустріальний стандарт у Next.js екосистемі,
- готова обробка CSRF, ротації токенів, cookie-флагів,
- легко додати OAuth (Google) пізніше, якщо знадобиться.

Альтернатива — самописна автентифікація на `jose` + `bcrypt`
(~150 рядків). Дає більше контролю, але вищий ризик криптографічної
помилки і складніше захищати на дипломі.

## 5. Захист cookie і HTTP

- `httpOnly: true` — JS на сторінці не може прочитати токен (захист від XSS).
- `secure: true` — лише по HTTPS.
- `sameSite: "lax"` — захист від CSRF при переходах з інших сайтів.
- `maxAge` — 7 днів з ротацією при кожному запиті.
- HTTPS-only через redirect у Vercel/Nginx.
- `Content-Security-Policy` header у `next.config.ts` для блокування
  ін'єкцій скриптів.

## 6. Захист точки входу `/login`

- Сторінка `/login` **не лінкується з лендингу** — користувач має знати URL.
- `robots.txt` забороняє індексацію `/login`, `/dashboard`, `/orders`,
  `/clients`, `/finance` тощо.
- `<meta name="robots" content="noindex, nofollow">` на CRM-сторінках.
- **Rate limiting** на `/login` — максимум 5 спроб на хвилину з одного IP
  (можна через `@upstash/ratelimit` або Vercel Edge Config).
- Логування невдалих спроб для аудиту.

---

# ПРОМПТ ДЛЯ CLAUDE CODE

Скопіювати наступний блок у Claude Code в корені проєкту
(`D:\Дипломи\auto-crm-project\auto-crm-project`):

---

````
Реалізуй систему автентифікації та захисту CRM-зони для проєкту nice.car.if.

КОНТЕКСТ ПРОЄКТУ:
- Next.js 15 (App Router) + TypeScript + Prisma (PostgreSQL).
- Структура: `app/(site)` — публічний лендинг, `app/(crm)` — закрита CRM.
- Обидві зони на одному домені.
- Зараз у схемі немає моделі User/Session і немає жодної перевірки доступу.
- Server actions у файлах `app/(crm)/**/actions.ts` викликають Prisma напряму.
- Існує модель `Worker` з ролями (PREP, PAINTER, POLISHER, OWNER, OTHER) —
  логін має бути привʼязаний до Worker через nullable foreign key.

ЩО ПОТРІБНО ЗРОБИТИ:

1. PRISMA: додай моделі `User` і `Session` у `prisma/schema.prisma`.
   `User` має поля: id (uuid), email (unique), passwordHash, workerId (unique nullable),
   relation на Worker, sessions, createdAt, updatedAt.
   `Session` має поля: id, userId, expiresAt, relation на User з onDelete: Cascade.
   У моделі Worker додай зворотний relation `user User?`.
   Згенеруй міграцію `npx prisma migrate dev --name add_auth`.

2. БІБЛІОТЕКИ: встанови `next-auth@beta` (v5), `@auth/prisma-adapter`,
   `bcryptjs`, `@types/bcryptjs`.

3. AUTH.JS КОНФІГ: створи `auth.ts` у корені з Credentials provider.
   - Email + password.
   - Хешування через bcryptjs (salt rounds = 12).
   - Prisma adapter.
   - Session strategy: "jwt", maxAge 7 днів.
   - Callbacks: у jwt поклади userId і workerId, у session прокинь їх назовні.
   - Cookie: httpOnly, secure (тільки в production), sameSite "lax".
   - secret з `process.env.AUTH_SECRET`.

4. ROUTE HANDLER: створи `app/api/auth/[...nextauth]/route.ts`,
   який експортує GET і POST з `auth.ts`.

5. MIDDLEWARE: створи `middleware.ts` у корені.
   - Захищені префікси: /dashboard, /orders, /clients, /vehicles,
     /finance, /backlog, /shopping, /settings.
   - Якщо немає session-cookie або токен невалідний — redirect на
     `/login?callbackUrl=<original>`.
   - `config.matcher` — масив усіх захищених шляхів.

6. AUTH HELPER: створи `lib/auth.ts` з функціями:
   - `getCurrentUser()` — повертає User|null з поточної сесії.
   - `requireAuth()` — кидає `redirect("/login")` якщо не залогінений,
     інакше повертає User.
   Використовуй `import { auth } from "@/auth"`.

7. ЗАХИСТ SERVER ACTIONS: у КОЖНОМУ файлі `app/(crm)/**/actions.ts`
   додай `await requireAuth()` першим рядком кожної експортованої
   async-функції. Усього файлів ~10, всі під `app/(crm)`.

8. ЗАХИСТ LAYOUT: у `app/(crm)/layout.tsx` додай на початку
   `const user = await requireAuth()` перед `Promise.all`.

9. СТОРІНКА ЛОГІНУ: створи `app/login/page.tsx` (поза групами).
   - Серверний компонент-обгортка + клієнтська форма.
   - Поля email, password, кнопка «Увійти».
   - Стиль: tailwind, нейтральний (білий фон, чорна форма),
     без посилань на лендинг.
   - При успіху — redirect на `callbackUrl` або `/dashboard`.
   - При помилці — toast через існуючий `@/components/ui/sonner`.

10. SEED USER: створи `prisma/seed.ts` (або додай у наявний),
    який створює одного OWNER-користувача з email "owner@nice.car.if"
    і паролем з `process.env.SEED_OWNER_PASSWORD`. Привʼязує його до
    існуючого або новоствореного Worker з роллю OWNER.

11. ENV: додай у `.env.example`:
    - AUTH_SECRET=<згенерувати: openssl rand -base64 32>
    - AUTH_TRUST_HOST=true
    - SEED_OWNER_PASSWORD=<сильний пароль>
    Онови `.env` локально цими ж змінними з реальними значеннями.

12. ROBOTS: створи `public/robots.txt`:
    ```
    User-agent: *
    Disallow: /login
    Disallow: /dashboard
    Disallow: /orders
    Disallow: /clients
    Disallow: /vehicles
    Disallow: /finance
    Disallow: /backlog
    Disallow: /shopping
    Disallow: /settings
    Allow: /
    ```

13. NOINDEX META: у `app/(crm)/layout.tsx` додай
    `export const metadata = { robots: { index: false, follow: false } }`.

14. RATE LIMITING (опційно, якщо є час): додай `@upstash/ratelimit`
    + `@upstash/redis` для обмеження `/api/auth/callback/credentials`
    до 5 спроб/хвилину з одного IP. Якщо Upstash не налаштовано —
    залиш TODO-коментар у `middleware.ts` з посиланням на цю задачу.

ПРИНЦИПИ:
- НЕ ламай існуючий код у `app/(site)` — лендинг має залишатися
  публічним і статичним.
- НЕ змінюй логіку `actions.ts` — лише додай `requireAuth()` як
  перший рядок кожної функції.
- НЕ хардкодь паролі чи секрети — все через env.
- Усі коментарі і повідомлення помилок українською (відповідає
  стилю проєкту).
- Після завершення зроби `npm run build`, переконайся що проєкт
  компілюється без помилок.

ПЕРЕВІРКА (після реалізації):
1. Запустити `npm run dev`.
2. Відкрити http://localhost:3000/ — лендинг доступний.
3. Відкрити http://localhost:3000/dashboard — редирект на /login.
4. Залогінитись через seed-юзера — потрапляєш на /dashboard.
5. Спробувати POST на server action без cookie через curl — отримати
   redirect/помилку.
6. Перевірити DevTools → Application → Cookies: токен має прапори
   HttpOnly + Secure (Secure лише в production build).
````

---

## 7. Що увійде в пояснювальну записку

З цього файлу для розділу «Безпека системи» можна взяти:
- **постановку проблеми** (п. 1) — обґрунтування актуальності розділу,
- **архітектурне рішення** (п. 2) — трирівневий захист як приклад
  принципу *defense in depth*,
- **зміни в моделі даних** (п. 3) — діаграма ER з новими сутностями,
- **обґрунтування вибору технології** (п. 4) — порівняння Auth.js vs
  власне рішення,
- **технічні заходи захисту cookie/HTTP** (п. 5) — як приклад
  застосування OWASP-рекомендацій,
- **захист точки входу** (п. 6) — robots.txt, noindex, rate limiting
  як комплекс мір проти brute force і автоматичного сканування.

Промпт для Claude Code також можна навести як ілюстрацію методології
розробки з AI-асистентом (підрозділ «Інструменти розробки» або
«Методологія реалізації»).
