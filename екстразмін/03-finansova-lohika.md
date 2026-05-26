# Екстра-зміна #03 — Фінансова логіка замовлення (повний аудит)

**Дата:** 2026-05-26
**Контекст:** На картці замовлення три фінансові блоки (Роботи, Запчастини,
Фінанси, Зарплати майстрів) показують неузгоджені суми і не реагують на
динамічні зміни. Цей документ — повний опис того, як ВСЕ це має працювати,
зведений з аудиту реальної роботи власника цеху (Дмитра) і поточного коду.

---

## 1. Бізнес-аудит — що насправді робить власник

**Дійові особи:** власник цеху (Дмитро), один найманий майстер, інколи —
підготовщик. Клієнт.

**Економіка одного замовлення:**

1. **Орієнтовна ціна** оголошується клієнту на старті (по фото або
   первинному огляду). Це лише орієнтир, не контракт.
2. **Завдаток** береться при передачі ключів — на запчастини і матеріали.
3. **Запчастини / матеріали** мають дві ціни: «план» (озвучили клієнту,
   `OrderPart.estimatedPrice`) і «факт» (реальна закупка,
   `OrderPart.actualPrice`). Різниця — інформація для майбутніх оцінок,
   не для перерахунку клієнту.
4. **Роботи** (`OrderWork[]`) — це **праця**. Сюди вкладені люди, не запчастини.
   Базова робота, рихтування, пайка, фарбування — все, що робиться руками.
5. **Загальна сума** = роботи (за фактом виконання) + запчастини
   (за фактом, якщо вже закуплені; за планом, якщо ще ні).
6. Клієнт **поступово виплачує** загальну суму (`Order.totalPaid` накопичується
   через кнопки «+100 / +500 / +1000» або ручне введення).
7. Після того, як замовлення закрите, **залишок на людей** = роботи (за фактом).
   Цей залишок розподіляється між власником і майстрами через `WorkerShare`.
8. Типове правило розподілу: **Власник 50% / Майстер 50%** від залишку на
   людей. Шаблон зберігається як `ShareTemplate { isDefault: true }`.
9. Матеріали в розподіл НЕ ВХОДЯТЬ — це pass-through. Клієнт фактично
   оплачує матеріали, власник їх купує, грошей з матеріалів собі НЕ бере.

**Ключова теза, яка все спрощує:**
> «Тато бере повну суму за роботу, віднімає матеріали (pass-through),
> і ділить решту між людьми. Решта = сума робіт.»

Тобто `сумаРобіт ≡ залишокНаЛюдей`. Це робить логіку прозорою і дозволяє
показувати «план розподілу» одразу, як тільки вписані роботи — задовго до того,
як клієнт усе оплатив.

---

## 2. Сутності і поля (наскільки відповідає Prisma)

Поточна схема `prisma/schema.prisma` уже містить майже все потрібне.
Нагадування про критичні поля для фінансів:

```
Order {
  estimatedPrice    Decimal      // орієнтовна ціна (не для розрахунків)
  advancePayment    Decimal      // завдаток
  totalPaid         Decimal      // вже отримано від клієнта (БЕЗ завдатку)
  currency          Currency     // основна валюта замовлення (для відображення)
  baseExchangeRate  Decimal?     // курс USD→UAH на момент створення замовлення

  works             OrderWork[]
  parts             OrderPart[]
  workerShares      WorkerShare[]
}

OrderWork {
  price             Decimal      // вартість роботи
  currency          Currency     // власна валюта запису
  exchangeRate      Decimal?     // курс на момент створення цього запису
}

OrderPart {
  estimatedPrice    Decimal      // план
  actualPrice       Decimal?     // факт (nullable)
  currency          Currency
  exchangeRate      Decimal?
}

WorkerShare {
  sharePercent      Decimal?     // % від залишку (null = фіксована сума)
  amount            Decimal      // фактична сума (обчислена з %)
  currency          Currency
  exchangeRate      Decimal?
}
```

**Ключова інваріанта:** валюта зберігається **на рівні кожного запису**, не лише
на рівні замовлення. Запис фіксує `currency + exchangeRate` на момент створення —
це «заморожує» його реальну вартість незалежно від подальших курсових коливань.

---

## 3. Інваріанти (правила, які мають виконуватись ЗАВЖДИ)

1. **Один запис = одна валюта + один заморожений курс.** Зміна `currency` запису
   має оновлювати `exchangeRate` на поточний (бо інакше виходить вартість у новій
   валюті по старому курсу — нісенітниця).
2. **Усі агрегати нормалізуються до однієї валюти перед сумуванням.** Не можна
   складати «100 USD + 2000 UAH = 2100». Треба: `100 × rate + 2000`.
3. **Валюта відображення (`displayCurrency`) задається в `CurrencyProvider`** —
   це лише вибір, ЯК показати. Дані в БД не міняються при переключенні.
4. **`Загальна сума = sum(works) + sum(parts)`** (у нормалізованій валюті).
   Для parts використовується `actualPrice ?? estimatedPrice`.
5. **`Залишок на людей = sum(works)`** (у нормалізованій валюті).
   Це і «план» (доки замовлення не закрите), і «факт» (бо матеріали — pass-through).
6. **`До оплати = max(0, ЗагальнаСума − Завдаток − Оплачено)`**.
7. **`sum(WorkerShare.amount) ≤ ЗалишокНаЛюдей`** (нормалізовано). Якщо більше —
   попередження в UI.
8. **Зарплата власника = ЗалишокНаЛюдей − sum(WorkerShare.amount).** Власник —
   це різниця; він НЕ обовʼязково має окремий `WorkerShare`-запис (хоча може,
   якщо хочеться явності).
9. **Завдаток + Оплачено ≤ ЗагальнаСума** (можна попередити, але не блокувати —
   бо буває переплата зі здачею).
10. **Закриття замовлення (`status = CLOSED`)** заморожує всі `WorkerShare.amount`
    у валюті/курсі, які діяли на момент закриття. Після цього перерахунок
    автоматично не робиться, тільки вручну.

---

## 4. Обчислювальний конвеєр — одна чиста функція

Уся фінансова логіка має бути зведена до **однієї чистої функції** на бекенді,
яка приймає `order` (з усіма relations) + `displayCurrency` + `fallbackRate`,
і повертає **обʼєкт з усіма обчисленими сумами**. Усе UI читає ТІЛЬКИ цей обʼєкт.

```ts
// lib/finance.ts (нова експортна функція)

export interface OrderTotals {
  worksTotal: number;          // sum(works) у displayCurrency
  partsEstimatedTotal: number; // sum(parts.estimatedPrice) у displayCurrency
  partsActualTotal: number;    // sum(parts.actualPrice ?? estimatedPrice)
  orderTotal: number;          // worksTotal + partsActualTotal
  advance: number;             // order.advancePayment у displayCurrency
  paid: number;                // order.totalPaid у displayCurrency
  outstanding: number;         // max(0, orderTotal − advance − paid)
  poolForPeople: number;       // = worksTotal (синонім для ясності)
  allocatedToWorkers: number;  // sum(workerShares.amount)
  ownerRemainder: number;      // poolForPeople − allocatedToWorkers
  overAllocated: boolean;      // allocatedToWorkers > poolForPeople + 0.01
}

export function computeOrderTotals(
  order: OrderWithRelations,
  displayCurrency: Currency,
  fallbackRate: number,
): OrderTotals { /* ... */ }
```

Реалізація — на основі вже наявної функції `toDisplay` з `lib/finance.ts:107`.
Кожен запис нормалізується через свій власний `currency + exchangeRate`,
з фолбеком на `fallbackRate` (поточний курс) якщо `exchangeRate` відсутній.

**Жоден компонент UI не повинен робити власну математику.** Усі рядки на
екрані — це `formatMoney(totals.X, displayCurrency)`.

---

## 5. Як саме нормалізувати валюту (правило одного рядка)

Для будь-якого запису з полями `(amount, currency, exchangeRate)`:

```ts
toDisplay({ amount, currency, exchangeRate }, displayCurrency, fallbackRate)
```

- `currency === displayCurrency` → повернути `amount`.
- `UAH → USD`: `amount / (exchangeRate ?? fallbackRate)`.
- `USD → UAH`: `amount × (exchangeRate ?? fallbackRate)`.
- Будь-який інший випадок — нормалізувати через USD як проміжну валюту.

Це **єдине** місце, де відбувається конвертація. Усі агрегати викликають саме її.

---

## 6. Як це має взаємодіяти з фронтом

**Модель:** Server-Authoritative State (single source of truth — БД).
Жодних дублюючих обчислень на клієнті.

### Потік для **читання**
1. RSC-сторінка `app/(crm)/orders/[id]/page.tsx` робить `prisma.order.findUnique`
   з усіма relations (`works`, `parts`, `workerShares`).
2. Тут же викликає `computeOrderTotals(order, displayCurrency, rate)`.
3. Передає **і `order`, і `totals`** у клієнтські компоненти як props.
4. Усі компоненти (`FinanceBlock`, `WorkerShares`, `WorksConstructor` header)
   читають **лише `totals.X`**, не рахуючи нічого власноруч.

### Потік для **запису**
1. Користувач змінює щось (додає роботу, редагує ціну запчастини, тицяє +500).
2. Клієнтський компонент тримає **локальний state ТІЛЬКИ для поточного input**
   (щоб поле не втрачало фокус — баг CRM-B01 з попереднього файлу).
3. На `onBlur` (або кнопкою «Зберегти») викликається server action.
4. Server action: `prisma.update(...)` → `revalidatePath('/orders/[id]')` → return.
5. Клієнт викликає `router.refresh()` — Next.js перевантажує RSC-сторінку,
   та повертає свіжий `order` + перерахований `totals`.
6. Усі компоненти отримують нові props і перерендерюються з новими сумами.

### Чому це гарантує синхронність
- Сума робіт у заголовку картки «Роботи», у блоці «Фінанси» і в «Зарплати майстрів»
  читається з **одного і того ж** `totals.worksTotal`.
- Якщо БД оновилась, refresh підтягує нові дані, і всі три місця показують
  однакове число.
- Не може виникнути ситуація, коли заголовок показує 12 650 ₴, а Фінанси — 8 600.

### Чи не повільно це
Ні. `router.refresh()` робить один HTTP-запит до RSC-ендпоінта Next.js, який
рендерить **тільки оновлений сегмент**. Це ~50-100 мс. Швидше, ніж писати OPTIMISTIC
UI з reconciliation і відловлювати краєві випадки.

### Винятки з server-authoritative — де потрібен local state
- Текст у `<input>` поки користувач його редагує (інакше фокус скаче).
- Спливаючі дропдауни, модалки — суто UI state.
- Усе інше — з пропсів.

---

## 7. Конкретні баги (file:line + причина)

### Bug F-01. `calcOrderTotal` валютно-наївна
**Файл:** `lib/utils.ts:22-30`
```ts
export function calcOrderTotal(works, parts) {
  const worksTotal = works.reduce((sum, w) => sum + toNumber(w.price), 0); // ← сумує без конверсії
  const partsTotal = parts.reduce(...)
  return worksTotal + partsTotal;
}
```
**Слідство:** `100 USD + 2000 UAH = 2100`. Звідси 8 600 ₴ у Фінансах
(100+2000+2000+4500 «гривень») замість 12 650 ₴.
**Виправлення:** Видалити цю функцію або переписати з параметрами
`(works, parts, displayCurrency, fallbackRate)` і нормалізацією через `toDisplay`.

### Bug F-02. `FinanceBlock` робить власну валютно-наївну математику
**Файл:** `components/orders/OrderDetail/FinanceBlock.tsx:40-46`
```ts
const worksTotal = order.works.reduce((s, w) => s + Number(w.price), 0);
const partsTotal = order.parts.reduce(...);
const orderTotal = calcOrderTotal(order.works, order.parts);
```
Потім `fmt(worksTotal)` конвертує суму як суцільну, по `orderCurrency`,
але запис уже міг бути в іншій валюті — конверсія застосовується «вгору» по
вже зіпсованому сумі.
**Виправлення:** Видалити локальну математику. Приймати `totals` як prop і
показувати `formatMoney(totals.worksTotal, displayCurrency)`.

### Bug F-03. `WorkerShares` рахує базу як `totalPaid − partsTotal`
**Файл:** `components/orders/OrderDetail/WorkerShares.tsx:553-554`
```ts
// B06: base = actual received money minus actual material cost
const base = Math.max(0, Number(order.totalPaid) - partsTotal);
```
**Слідство:** Поки клієнт не оплатив нічого (`totalPaid = 0`),
`base = max(0, 0 − 1700) = 0`. Звідси «Залишок на людей: 0 ₴» на скріншоті.
**Чому це невірно за бізнес-логікою:** Власник хоче бачити **план розподілу**
одразу, як тільки вписані роботи, не чекаючи фактичних платежів. Cashflow-логіка
(«доступно зараз») — другорядна.
**Виправлення:** `base = totals.worksTotal` (тобто `poolForPeople`).
Опційно — нижче маленьким рядком показати «Доступно зараз (по факту оплати):
`max(0, paid − partsActual)`», щоб не втрачати корисну cashflow-інфу.

### Bug F-04. `updateWork` не оновлює `exchangeRate` при зміні валюти
**Файл:** `app/(crm)/orders/[id]/actions.ts:35-50`
```ts
await prisma.orderWork.update({
  where: { id: workId },
  data: { name, price, ...(currency ? { currency } : {}) },
  // exchangeRate НЕ оновлюється
});
```
**Слідство:** Користувач міняє валюту запису з UAH на USD. Поле `currency`
оновлюється, але `exchangeRate` лишається або null (фолбек на поточний
fallbackRate), або зі старим UAH-курсом, який не має сенсу для USD-суми.
**Виправлення:** При зміні `currency` обовʼязково перезаписувати
`exchangeRate = await getCurrentRate()`. Те саме — для `updatePart`.

### Bug F-05. UI не оновлюється динамічно
**Спостереження користувача:** «Сума робіт в фінансах не оновляється коли
додаю чи віднімаю роботи».
**Діагноз:** `revalidatePath` викликається з actions, `router.refresh()` —
з клієнтів. Має працювати. Підозра — на одне з двох:
   (а) `FinanceBlock` тримає в `useState` поля, які блокують перерендер
       (рядки 32-36): `estimatedPrice`, `advPay`, `totalPaid` ініціалізуються
       з props лише на першому рендері. Якщо після refresh приходять нові
       значення з БД (через інший пристрій або кешу) — вони ігноруються.
   (б) `worksTotal`/`partsTotal` рахуються щоразу з `order.works`, тож якщо
       prop приходить новий — мають оновитись. Але якщо UI «не реагує»,
       це може бути проявом F-01/F-02: суми ОНОВЛЮЮТЬСЯ, але показують
       не те, що користувач очікує (бо математика неправильна).
**Виправлення:** Після фіксу F-01..F-03 переконатись, що FinanceBlock приймає
`totals` як prop і не тримає в локальному стані нічого, окрім самих input-полів
(`advPay`, `totalPaid`, `estimatedPrice` — це editable inputs, тут локальний
state виправданий, але треба `useEffect` для синхронізації з props при
зовнішніх змінах).

### Bug F-06. `dreamFund` контрибуція рахується від валютно-наївного total
**Файл:** `lib/finance.ts:17-36` (функція `handleOrderClosed`).
Викликає `calcOrderTotal(works, parts)` без конверсії. Та сама проблема,
тільки результат пливе у фонд розвитку.
**Виправлення:** Використати новий `computeOrderTotals(order, ...).orderTotal`.

---

## 8. Acceptance criteria (як перевіряти що виправили)

Тестовий сценарій (вручну):
1. Створити нове замовлення.
2. Додати роботу: «Базова робота», 100 USD (поточний курс ~41.5).
3. Додати роботу: «Рихтування», 2000 UAH.
4. Додати запчастину: «Крило», estimated=1500 UAH, actual=1700 UAH.

Очікувані числа (displayCurrency=UAH, fallbackRate=41.5):

| Поле                          | Очікувано  | Поточне (баг)  |
|-------------------------------|------------|----------------|
| Заголовок «Роботи»            | 6 150 ₴    | 6 150 ₴ ✓      |
| FinanceBlock «Роботи»         | 6 150 ₴    | 2 100 ₴ ✗      |
| FinanceBlock «Запчастини»     | 1 700 ₴    | 1 700 ₴ ✓      |
| FinanceBlock «Загальна сума»  | 7 850 ₴    | 3 800 ₴ ✗      |
| WorkerShares «Загальна сума»  | 7 850 ₴    | 3 800 ₴ ✗      |
| WorkerShares «Матеріали факт» | 1 700 ₴    | 1 700 ₴ ✓      |
| WorkerShares «Залишок на людей»| 6 150 ₴   | 0 ₴ ✗          |

Додаткові перевірки:
- Натиснути «+500» у Оплачено — `totalPaid` в БД, «До оплати» зменшується на 500.
- Видалити роботу — заголовок, Фінанси і Залишок на людей одночасно зменшуються.
- Перемкнути валюту відображення USD↔UAH — всі суми перераховуються згідно
  фіксованих per-record курсів.
- Створити WorkerShare з 50% — `amount = 6150 × 0.5 = 3075 ₴`, `ownerRemainder = 3075`.
- Закрити замовлення (`CLOSED`) — `handleOrderClosed` контрибутить 5% від 7850 = 392.5
  у фонд розвитку (а не від 3800).

---

## 9. Промпт для Claude Code

````
Виправ фінансову логіку картки замовлення в проєкті nice.car.if (auto-crm-project).
Усі деталі — у файлі `екстразмін/03-finansova-lohika.md`. Прочитай його повністю
перед початком.

ЗАГАЛЬНА ідея: централізувати ВСІ обчислення сум на сервері, у одній чистій
функції `computeOrderTotals`, і змусити фронт читати лише її результат.

ЩО ЗРОБИТИ:

1. У `lib/finance.ts` додай нову експортну функцію `computeOrderTotals` згідно
   специфікації з розділу 4 файлу 03. Інтерфейс `OrderTotals` теж експортуй.
   Реалізацію роби через існуючу хелперну функцію `toDisplay` (lib/finance.ts:107).
   Параметри: (order з works/parts/workerShares relations, displayCurrency, fallbackRate).

2. У `app/(crm)/orders/[id]/page.tsx` після `prisma.order.findUnique`:
   - отримай `displayCurrency` з Settings (вже робиться в layout — прокинь
     сюди через cookies або повтори запит)
   - отримай `fallbackRate` з `getCurrentRate()`
   - виклич `computeOrderTotals(order, displayCurrency, fallbackRate)`
   - передавай `totals` як новий prop у FinanceBlock, WorkerShares і
     OrderHeader (якщо їм потрібна загальна сума).

3. У `components/orders/OrderDetail/FinanceBlock.tsx`:
   - видали локальні обчислення worksTotal/partsTotal/orderTotal (рядки 40-46)
   - прийми `totals: OrderTotals` як prop
   - рядки відображення замінити на `formatMoney(totals.worksTotal, displayCurrency)`
     і т.д.
   - `debt` обчислити як `totals.outstanding` (з урахуванням локальних змін
     advance/paid — поки користувач редагує, до натискання «Зберегти»)
   - НЕ чіпай локальні useState для editable inputs (estimatedPrice, advPay,
     totalPaid) — там фокус-проблема, локальний state виправданий
   - Додай useEffect, який синхронізує локальний state з пропсами, коли props
     змінюються ззовні (`useEffect(() => setTotalPaid(...), [order.totalPaid])`).

4. У `components/orders/OrderDetail/WorkerShares.tsx`:
   - видали локальні обчислення orderTotal/partsTotal/base (рядки 547-554)
   - прийми `totals: OrderTotals` як prop
   - `base` = `totals.poolForPeople` (тобто worksTotal)
   - відображення «Загальна сума» = `totals.orderTotal`,
     «Матеріали факт» = `totals.partsActualTotal`,
     «Залишок на людей» = `totals.poolForPeople`
   - опційно додай рядок дрібним шрифтом: «Доступно по факту оплати:
     formatMoney(max(0, totals.paid + totals.advance − totals.partsActualTotal))»
   - валідація `overDistributed` лишається, але порівнюй з `totals.poolForPeople`,
     не з кастомним `base`.

5. У `lib/utils.ts`:
   - познач `calcOrderTotal` як DEPRECATED у коментарі (не видаляй одразу — є інші
     виклики); замість неї всюди має використовуватись `computeOrderTotals`
   - `calcDebt` — те саме, deprecated
   - проскануй кодову базу на виклики `calcOrderTotal` і `calcDebt`, замінити на
     `computeOrderTotals`

6. У `app/(crm)/orders/[id]/actions.ts`:
   - функції `updateWork` і `updatePart`: при зміні поля `currency` обовʼязково
     оновлювати `exchangeRate = await getCurrentRate()`. Зараз цього немає.

7. У `lib/finance.ts:handleOrderClosed` (рядок 17): замінити виклик
   `calcOrderTotal(works, parts)` на нову логіку через `computeOrderTotals`.

8. У `lib/finance.ts:aggregateFinanceData` (рядок 124): функція вже робить per-record
   нормалізацію через `toDisplay`, але виклик `calcOrderTotal` на рядку 155 — баг.
   Замінити на `computeOrderTotals(o, displayCurrency, fallbackRate).orderTotal`.

ВЕРИФІКАЦІЯ після впровадження:
- npm run build (без помилок)
- Запустити сценарій з розділу 8 файлу 03 і звірити числа з таблицею
- На картці замовлення з мішаними валютами (1 робота USD + 1 робота UAH)
  переконатися, що заголовок «Роботи», Фінанси-блок і Зарплати показують
  ОДНАКОВУ загальну суму
- Додати роботу, переконатися що сума оновилась у всіх трьох місцях БЕЗ
  перезавантаження сторінки (через router.refresh)
- Видалити роботу — те саме
- Змінити валюту запису — переконатися, що exchangeRate оновився на поточний
  (перевірити в БД через prisma studio)

ВАЖЛИВО:
- НЕ роби rename полів у Prisma — це зламає міграції
- НЕ переписуй `toDisplay`, вона вже коректна
- НЕ змінюй валюту на рівні замовлення (`Order.currency`) при зміні валюти
  окремого запису — це різні рівні абстракції
- Усі тексти повідомлень — українською
````

---

## 10. Що увійде в пояснювальну записку

Цей файл — фундамент для розділу **«Архітектура бізнес-логіки фінансового
модуля»**. Структура для записки:

- **Доменна модель** — розділ 1-2 цього файлу: акт-схема процесу, сутності
  з Prisma, відображення реальної економіки в БД.
- **Інваріанти системи** — розділ 3: 10 правил як приклад формалізації
  бізнес-вимог (це канонічний приклад «business rules → invariants → code»,
  що оцінюється на захисті).
- **Розрахунковий конвеєр** — розділ 4: pure function як точка єдиної правди.
  Графічно — діаграма «order → computeOrderTotals → OrderTotals → UI».
- **Робота з мульти-валютою** — розділ 5: per-record snapshot курсу як
  патерн із бухгалтерських систем (immutability of historical values).
- **Взаємодія з фронтом** — розділ 6: server-authoritative state у Next.js
  App Router, обґрунтування вибору (порівняння з optimistic UI).
- **Регресійний аналіз дефектів** — розділ 7: 6 виявлених багів,
  кожен — з file:line, причиною, виправленням. Це сильний матеріал для
  розділу «тестування і верифікація».
- **Acceptance-critereia** — розділ 8: формальна таблиця «очікувано vs
  поточне». Цей формат добре сприймається на захисті як доказ того,
  що автор тестує систему, а не просто пише код.
