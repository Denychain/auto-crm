# Екстра-зміна #09 — Майстер · Карти · Робоча форма заявки

**Дата:** 2026-05-26
**Контекст:** Три точкові правки, кожна перевірена в коді:
1. У hero на /master замінити `[ Ім'я ]` плейсхолдер на «Дмитро».
2. На /contacts Apple Maps і Waze ведуть на хибну точку (захардкоджені
   координати ≠ адресі цеху).
3. Форма заявки на /contacts повинна **реально працювати** — додавати
   нового клієнта в CRM зі статусом QUEUE («Черга») плюс прикріплювати
   фото пошкоджень.

---

## 1. Hero на /master — замінити плейсхолдер імені

### Що зараз
**Файл:** `app/(site)/master/master-client.tsx:269-273`
```tsx
<aside className="id-panel" aria-label="Картка майстра">
  <div className="who">
    <span className="name">[ Ім&#x2019;я ]</span>
    <span className="role">// Власник · Колорист</span>
  </div>
```

Це залишок з шаблону. Hero виводить «Я особисто фарбую ваше авто», а в
id-panel поруч стоїть `[ Ім'я ]` — виглядає недоробленим.

### Як виправити
Замінити рядок 271:
```tsx
<span className="name">Дмитро</span>
```

(Без квадратних дужок, без HTML-entity `&#x2019;`.)

### Дотичні файли
- У `app/(site)/master/page.tsx:5-8` уже є правильний рядок «Дмитро — власник
  кузовного цеху NICE.car.if», metadata OK.
- У `master-client.tsx:780` (приблизно) є секція цитат, де підписи теж
  згадують власника — перевірити, чи всюди «Дмитро» (а не «Майстер» чи
  «Власник» без імені). Якщо там «Дмитро Литвин» — узгодити з прізвищем,
  бо у файлі правок (02) ми домовились на «Майстер Дмитро» без прізвища.

---

## 2. Apple Maps і Waze — некоректна точка

### Що зараз
**Файл:** `app/(site)/contacts/page.tsx:373, 382`
```tsx
<a href="https://waze.com/ul?ll=48.9226,24.7111&navigate=yes">Waze</a>
<a href="https://maps.apple.com/?q=48.9226,24.7111">Apple Maps</a>
```

Координати `48.9226, 24.7111` — це **центр Івано-Франківська** (приблизно
біля Площі Ринок), а не вул. Максимовича, 15 (західна частина міста).

Координати з'являються також на landing у footer (`page.tsx:1292-1293`) як
декоративний текст «48.9226° N · 24.7111° E» — те саме хибне значення.

### Корінь проблеми
Захардкоджені координати не співпадають з адресою у `CONTACTS.address`
(«вул. Максимовича, 15»). Google Maps шортлінк `CONTACTS.googleMaps`
(`https://maps.app.goo.gl/8yUeMbnw5k14jL7w9`) веде правильно, бо він
вирішується на стороні Google. А Waze і Apple Maps беруть голі координати —
і опиняються в неправильному місці.

### Як виправити (два варіанти)

**Варіант A (швидкий, надійний) — використати адресу замість координат:**

Замінити URL так, щоб Waze/Apple геокодували адресу самостійно:
```tsx
<a href={`https://www.waze.com/ul?q=${encodeURIComponent(CONTACTS.address)}&navigate=yes`}>Waze</a>
<a href={`https://maps.apple.com/?q=${encodeURIComponent(CONTACTS.address)}`}>Apple Maps</a>
```

Це працює завжди — обидва сервіси мають геокодер і знайдуть Максимовича,
15 у Івано-Франківську. Без жодних хардкодів.

**Варіант B (точніший) — отримати реальні координати точки:**

1. Відкрити `CONTACTS.googleMaps` у браузері (https://maps.app.goo.gl/8yUeMbnw5k14jL7w9).
2. Праворуч клікнути на пін → координати з'являться у форматі `48.XXXX, 24.XXXX`.
3. Додати в `lib/constants.ts`:
   ```ts
   coordinates: { lat: 48.XXXX, lng: 24.XXXX },
   ```
4. У `/contacts:373, 382` використати їх:
   ```tsx
   <a href={`https://www.waze.com/ul?ll=${CONTACTS.coordinates.lat},${CONTACTS.coordinates.lng}&navigate=yes`}>Waze</a>
   <a href={`https://maps.apple.com/?ll=${CONTACTS.coordinates.lat},${CONTACTS.coordinates.lng}`}>Apple Maps</a>
   ```
5. У footer landing (`app/(site)/page.tsx:1292-1293`) замінити захардкоджені
   `48.9226° N · 24.7111° E` на динамічні `{CONTACTS.coordinates.lat}° N · {CONTACTS.coordinates.lng}° E`.

**Рекомендую варіант A** — простіше і безпечніше. Координати завжди мають
ризик роз'їхатись з адресою. Геокодер на стороні Apple/Waze робить цю
синхронізацію автоматично.

---

## 3. Робоча форма заявки на /contacts

### Що зараз
**Файл:** `app/(site)/contacts/page.tsx:102-105`
```ts
function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setFormSent(true);   // ← все
}
```

Натиснув «Надіслати» → побачив «✓ Заявку отримано». Жодного запиту, жодного
файлу нікуди не йде. Це **обманює користувача**.

### Цільова поведінка
Користувач заповнює форму → натискає «Надіслати» → :
1. Фото завантажуються в Cloudinary.
2. Сервер створює клієнта в CRM (упсерт по телефону).
3. Створює транспортний засіб-плейсхолдер (плата не вимагається на сайті).
4. Створює замовлення зі статусом `QUEUE` («Черга»), позначає
   `fromWebsite=true`, додає фото як `OrderPhoto type=ACT_IN`.
5. Дашборд відображає віджет «Нові заявки з сайту: N».
6. Власник у CRM відкриває замовлення → редагує плату/деталі → переводить
   у роботу.

### Архітектурне рішення

**Чому НЕ окрема модель `EstimateRequest`:** додатковий рівень абстракції
(заявка → переведення в замовлення вручну) ускладнює дашборд і дублює
логіку. Простіше — створити одразу `Order` зі статусом QUEUE і прапорцем
`fromWebsite`. Перевага: всі замовлення в одній таблиці, фільтр по
`fromWebsite` дає окремий вигляд «з сайту».

**Як обійти `Vehicle.plateNumber @unique` без даних плати з форми:**
Згенерувати тимчасову плату на кшталт `PEND-{nanoid(6)}` (наприклад,
`PEND-A4F2K9`). Власник у CRM при першому контакті з клієнтом замінить
на реальну. Альтернатива — зробити `plateNumber` nullable у схемі, але це
зачепить багато існуючої логіки (пошук по платі — основний UX).

### Зміни у Prisma

```prisma
model Order {
  ...existing...
  fromWebsite Boolean @default(false)   // NEW
}
```

Міграція: `npx prisma migrate dev --name add_order_from_website`.

### Server action

Новий файл `app/(site)/contacts/actions.ts`:

```ts
"use server";

import { z } from "zod";
import { customAlphabet } from "nanoid";
import { prisma } from "@/lib/prisma";
import { OrderStatus, PhotoType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentRate } from "@/lib/exchange-rate";

const platePending = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

const SubmitSchema = z.object({
  name: z.string().min(2, "Введіть ім'я"),
  phone: z.string().regex(/^\+?\d{10,13}$/, "Невірний формат телефону"),
  car: z.string().min(2, "Опишіть авто").optional(),
  damage: z.string().max(2000).optional(),
  photoUrls: z.array(z.string().url()).max(5).default([]),
});

export type SubmitInput = z.infer<typeof SubmitSchema>;

export async function submitContactRequest(
  input: SubmitInput
): Promise<{ ok: true; orderId: string } | { ok: false; error: string }> {
  // ⚠️ ВАЖЛИВО: ця action ПУБЛІЧНА (немає requireAuth) — обмежити rate limit на проді.

  const parsed = SubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    // 1. Upsert клієнта по телефону.
    const phone = normalizePhone(data.phone);
    const client = await prisma.client.upsert({
      where: { phone },
      create: { name: data.name, phone },
      update: {
        // оновлюємо ім'я, якщо вперше прийшов; не перезаписуємо існуюче без потреби
        name: data.name,
      },
    });

    // 2. Створити Vehicle з тимчасовою платою.
    const vehicle = await prisma.vehicle.create({
      data: {
        clientId: client.id,
        plateNumber: `PEND-${platePending()}`,
        make: data.car ?? "—",
        model: "—",
      },
    });

    // 3. Створити Order у статусі QUEUE з прапорцем fromWebsite.
    const baseExchangeRate = await getCurrentRate();
    const order = await prisma.order.create({
      data: {
        clientId: client.id,
        vehicleId: vehicle.id,
        status: OrderStatus.QUEUE,
        description: data.damage,
        estimatedPrice: 0,
        advancePayment: 0,
        totalPaid: 0,
        baseExchangeRate,
        fromWebsite: true,
      },
    });

    // 4. Додати фото пошкоджень.
    if (data.photoUrls.length > 0) {
      await prisma.orderPhoto.createMany({
        data: data.photoUrls.map((url) => ({
          orderId: order.id,
          url,
          type: PhotoType.ACT_IN,
          description: "Фото з форми сайту",
        })),
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/orders");

    return { ok: true, orderId: order.id };
  } catch (err) {
    console.error("[submitContactRequest]", err);
    return { ok: false, error: "Не вдалося зберегти заявку. Спробуйте ще раз або зателефонуйте." };
  }
}

function normalizePhone(raw: string): string {
  // 099 233 44 20 / 0992334420 / +380992334420 / 380992334420 → +380992334420
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+38" + digits;
  return "+" + digits;
}
```

### Frontend: переписати `handleSubmit` у `contacts/page.tsx`

```tsx
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setSubmitting(true);
  setErrorMsg(null);

  try {
    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);

    // 1. Завантажити фото в Cloudinary.
    const photoUrls = await Promise.all(
      files.map((f) => uploadImage(f))
    );

    // 2. Викликати server action.
    const result = await submitContactRequest({
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      car: String(formData.get("car") ?? "") || undefined,
      damage: String(formData.get("damage") ?? "") || undefined,
      photoUrls,
    });

    if (!result.ok) {
      setErrorMsg(result.error);
      setSubmitting(false);
      return;
    }

    setFormSent(true);
  } catch (err) {
    setErrorMsg(
      err instanceof Error ? err.message : "Помилка завантаження фото"
    );
    setSubmitting(false);
  }
}
```

Додати у стани: `const [submitting, setSubmitting] = useState(false);` і
`const [errorMsg, setErrorMsg] = useState<string | null>(null);`.

Додати `name` атрибути в інпути:
```tsx
<input id="f-name" name="name" ... />
<input id="f-phone" name="phone" ... />
<input id="f-car" name="car" ... />
<textarea id="f-damage" name="damage" ... />
```

Кнопка submit — додати `disabled={submitting}` і show loader.

Біля помилок — окремий блок `{errorMsg && <div className="form-error">{errorMsg}</div>}`.

Success-екран лишається той самий (форма вже має `formSent` state).

### Дашборд: віджет «Нові заявки з сайту»

Новий компонент `components/dashboard/WebRequestsWidget.tsx`:
- Запит: `prisma.order.findMany({ where: { fromWebsite: true, status: QUEUE } })`
- Виводить N карток з ім'ям клієнта, телефоном, фото-прев'ю, кнопкою «Відкрити».
- Лінк веде на `/orders/[id]` — там власник редагує плату/деталі.

Додати у `dashboard/page.tsx` поряд з іншими urgent-секціями.

### Опціонально: Telegram-бот для миттєвого сповіщення власника

Поки що не варто (потребує `TELEGRAM_BOT_TOKEN` і реєстрацію бота). Лишити
як TODO. Якщо буде час — додати у `submitContactRequest`:

```ts
await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: "POST",
  body: JSON.stringify({
    chat_id: process.env.TELEGRAM_OWNER_CHAT_ID,
    text: `🆕 Нова заявка з сайту\n${data.name} · ${data.phone}\nАвто: ${data.car ?? "—"}\n${data.damage ?? ""}\n\nВідкрити: ${baseUrl}/orders/${order.id}`,
  }),
  headers: { "Content-Type": "application/json" },
});
```

### Безпека: rate limit на server action

Бо це **публічна** action, її може спамити будь-хто. Як мінімум:

1. У middleware або всередині action перевіряти IP через `@upstash/ratelimit`
   (5 запитів на годину з одного IP).
2. Додати honeypot-поле в форму: невидимий `<input name="website">`, якщо
   заповнене — action відкидає (ботів вибиває).
3. Додати reCAPTCHA v3 (silent, без challenge) для серйозного захисту.

Поки що (для дипломної) — лишити TODO в коментарі, реалізувати honeypot
як найпростіший фільтр.

---

## 4. Acceptance criteria

### Сценарій 1 — Master hero
1. Відкрити `/master` → у id-panel замість `[ Ім'я ]` показано «Дмитро».
2. На дашборді розмітка не зламана.

### Сценарій 2 — Карти
1. Відкрити `/contacts` на десктопі.
2. Клікнути «Apple Maps» → відкривається Apple Maps з пінкою на вул.
   Максимовича, 15 (а не в центрі міста).
3. Клікнути «Waze» → відкривається Waze з тим самим маркером.
4. Клікнути «Google Maps» / «Побудувати маршрут» — теж веде туди.

### Сценарій 3 — Робоча форма
1. Відкрити `/contacts`, заповнити форму:
   - Ім'я: «Тест Тестенко»
   - Телефон: «099 555 00 99»
   - Авто: «Volkswagen Passat 2018»
   - Опис: «Подряпина на дверях, треба полірування»
   - Прикріпити 2 фото.
2. Натиснути «Надіслати заявку».
3. Очікувано:
   - Фото завантажуються в Cloudinary (видно прогрес).
   - Кнопка disabled, показує loader.
   - Через 2-5 сек — повідомлення «✓ Заявку отримано».
4. Відкрити CRM → `/dashboard`:
   - Бачимо віджет «Нові заявки з сайту: 1».
   - Клік на заявку → відкривається `/orders/[id]`.
5. У замовленні:
   - Клієнт: «Тест Тестенко», телефон «+380995550099».
   - Авто: плата «PEND-XXXXXX», make «Volkswagen Passat 2018», model «—».
   - Статус: QUEUE.
   - Опис: «Подряпина на дверях…».
   - Фото-Акт: 2 фото з Cloudinary URL.
6. Якщо ввести той самий телефон ще раз з іншою формою — клієнт
   **upserts** (не дублюється), створюється нове Order для цього ж клієнта.

### Сценарій 4 — Валідація
1. Подати форму з телефоном «123» → бачимо помилку «Невірний формат
   телефону», нічого не зберігається.
2. Подати з ім'ям «А» (1 символ) → «Введіть ім'я».
3. Подати з 10 фото → клієнт-side обмеження «до 5 файлів» спрацьовує.

---

## 5. Промпт для Claude Code

````
Виконай три точкові правки на публічному сайті nice.car.if (auto-crm-project).
Усі деталі — у файлі `екстразмін/09-master-contacts-form.md`.

ПРАВКА 1 — Master hero:
- У `app/(site)/master/master-client.tsx:271` замінити
  `<span className="name">[ Ім&#x2019;я ]</span>`
  на
  `<span className="name">Дмитро</span>`.

ПРАВКА 2 — Apple Maps і Waze:
- У `app/(site)/contacts/page.tsx:373, 382` замінити захардкоджені координати
  на адресу з CONTACTS:
    href={`https://www.waze.com/ul?q=${encodeURIComponent(CONTACTS.address)}&navigate=yes`}
    href={`https://maps.apple.com/?q=${encodeURIComponent(CONTACTS.address)}`}
- Перевірити, чи в footer landing (`app/(site)/page.tsx:1292-1293`) теж є
  захардкоджені «48.9226° N · 24.7111° E». Якщо так — поки залишити (це
  декоративний текст), але додати TODO-коментар.

ПРАВКА 3 — Робоча форма заявки:

3.1. PRISMA:
- Додати в модель Order поле `fromWebsite Boolean @default(false)`.
- Згенерувати міграцію: `npx prisma migrate dev --name add_order_from_website`.

3.2. ВСТАНОВИТИ ПАКЕТИ:
- `npm install zod nanoid`
- (zod уже може бути встановлений — перевірити package.json.)

3.3. SERVER ACTION:
- Створити файл `app/(site)/contacts/actions.ts` з функцією
  `submitContactRequest(input)`. Логіка:
  * Валідація через zod (name min 2, phone regex, car/damage optional,
    photoUrls.max(5)).
  * Нормалізація телефону до формату +380XXXXXXXXX.
  * Upsert Client по phone.
  * Create Vehicle з тимчасовою платою `PEND-${nanoid(6)}` (alphabet без
    подібних символів: ABCDEFGHJKLMNPQRSTUVWXYZ23456789), make = data.car,
    model = "—".
  * Create Order: status=QUEUE, fromWebsite=true, description=damage,
    estimatedPrice=0, advancePayment=0, totalPaid=0, baseExchangeRate
    через getCurrentRate().
  * Якщо photoUrls.length > 0 — createMany OrderPhoto з type=ACT_IN.
  * revalidatePath("/dashboard"), revalidatePath("/orders").
  * Try/catch — повертати { ok: false, error } на помилку.
  * Жодного requireAuth() — це публічна action.

3.4. FRONTEND `app/(site)/contacts/page.tsx`:
- Додати у стани: submitting (boolean), errorMsg (string|null).
- Додати name атрибути всім інпутам (name, phone, car, damage).
- Замінити handleSubmit на async-версію:
  * Завантажити кожне file через uploadImage (з lib/cloudinary.ts).
  * Викликати submitContactRequest з photoUrls.
  * Обробити result.ok / error.
- Кнопка submit: disabled={submitting}, показати loader або текст
  «Надсилається...».
- Над кнопкою — блок `{errorMsg && <div className="form-error">{errorMsg}</div>}`.
- Додати honeypot: невидимий <input name="website" tabIndex={-1}
  autoComplete="off" style={{ position: "absolute", left: "-9999px" }} />.
  У server action на початку: if (input.website) return { ok: true, orderId: "" }
  (тихо ігнорувати бота).

3.5. ДАШБОРД ВІДЖЕТ:
- Створити `components/dashboard/WebRequestsWidget.tsx`.
- У `app/(crm)/dashboard/page.tsx` додати запит на нові web-заявки:
    prisma.order.findMany({
      where: { fromWebsite: true, status: OrderStatus.QUEUE },
      include: { client: true, vehicle: true, photos: { take: 1 } },
      orderBy: { createdAt: "desc" },
    })
- Передати у віджет. Віджет рендерить картки з ім'ям, телефоном, фото-прев'ю
  (перше фото), кнопкою-лінком на /orders/[id].
- Розмістити віджет у «Потребує уваги» секції дашборду (перед DebtorsList).

ВЕРИФІКАЦІЯ:
- npm run build → без помилок.
- npm run dev → пройти сценарії 1-4 з розділу 4 файлу 09.
- Прямо у браузері: відкрити /contacts, заповнити форму з тестовими даними,
  переконатись що в Prisma Studio з'явились Client + Vehicle + Order
  з правильними полями.
- Перевірити що при повторному поданні з тим самим телефоном клієнт
  не дублюється (upsert працює).

ОБМЕЖЕННЯ:
- НЕ робити Telegram-бот сповіщення (потребує токену; зробити окремо).
- НЕ робити reCAPTCHA (тільки honeypot як базовий захист).
- НЕ робити rate-limit через Upstash (TODO-коментар у action).
- Cloudinary має бути налаштований — змінні NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  і NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET у .env.local. Якщо відсутні —
  uploadImage кидає помилку, форма показує її як errorMsg.
````

---

## 6. Що увійде в пояснювальну записку

Цей файл містить готовий приклад **«end-to-end лійки клієнтів»**:
публічний сайт → форма → бекенд → CRM → дашборд → робота з клієнтом.
Для записки це сильна ілюстрація:

- **Public-private boundary в Next.js** — як server action може бути
  публічною (без requireAuth), але при цьому валідованою (zod) і
  захищеною (honeypot, rate-limit). Контрастувати з CRM-action,
  які мають requireAuth.
- **Upsert як патерн ідемпотентності** — клієнт може кілька разів
  надіслати форму; не дублюємо, оновлюємо. Канонічна задача
  «exactly-once delivery в системах з UI».
- **Тимчасовий стан як архітектурний прийом** — `plateNumber = "PEND-XXX"`
  замість міграції на nullable. Демонстрація trade-off-у «invasive schema
  change vs пристосувальний workaround».
- **Feature flag через boolean** — `fromWebsite` як приклад
  лекс-маркера, що дозволяє відфільтрувати дашборду без зміни enum-ів
  чи окремих таблиць. Pragmatic engineering.
- **Frontend ↔ Backend ↔ DB як цілісний потік** — приклад того, як
  одна функціональна вимога зачіпає 4 шари коду (Prisma → action →
  client form → dashboard widget). Сильний матеріал для розділу
  «full-stack відповідальності».
