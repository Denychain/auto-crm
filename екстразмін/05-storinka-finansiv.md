# Екстра-зміна #05 — Сторінка «Фінанси» (повна специфікація)

**Дата:** 2026-05-26
**Контекст:** На сторінці `/finance` валюта не перемикається, числа
рахуються неузгоджено між картками. Цей файл — повний опис того, як
сторінка має працювати, від bookkeeping-моделі на бекенді до взаємодії
з фронтом.

> Передумова: файли `03-finansova-lohika.md` (computeOrderTotals) і
> `04-borh-i-valyuta-naskriznyy.md` (наскрізна валюта) мають бути впроваджені
> ПЕРШИМИ. Цей документ спирається на ту інфраструктуру.

---

## 1. Що зараз не так — точна діагностика

Я прочитав `app/(crm)/finance/page.tsx`, `lib/finance.ts:aggregateFinanceData`,
і всі 6 компонентів у `components/finance/`. Знайдено:

### Bug FIN-01. `aggregateFinanceData` викликається без `displayCurrency`
**Файл:** `app/(crm)/finance/page.tsx:32`
```ts
aggregateFinanceData(range),  // ← немає displayCurrency, фолбек на UAH
```
**Сигнатура:** `aggregateFinanceData(range, displayCurrency = Currency.UAH)`.
**Слідство:** Усі агрегати рахуються у UAH незалежно від налаштувань. Потім UI
викликає `formatMoney(value, displayCurrency)` і змінює лише значок.
**Виправлення:** Прочитати `displayCurrency` зі `Settings` (це вже зроблено на
рядку 37, але передано тільки в дочірні компоненти, а не в саму
агрегацію). Передати в `aggregateFinanceData`.

### Bug FIN-02. `aggregateFinanceData` поєднує валютну і фінансову логіку в одній функції
**Файл:** `lib/finance.ts:124-258`
Зараз функція робить ВСЕ: фетчить, нормалізує валюти per-record, агрегує
revenue/materials/wages/debt, окремо мапить orderPlanFact і workerGroups.
260 рядків в одній функції — і це причина того, що додати/змінити окрему
метрику складно.
**Виправлення:** Розбити на 4 чистих функції:
- `aggregateRevenue(closedOrders, displayCurrency, fallbackRate)` → number
- `aggregateMaterials(closedOrders, displayCurrency, fallbackRate)` → number
- `aggregateWages(closedOrders, displayCurrency, fallbackRate)` → number
- `aggregateActiveDebt(activeOrders, displayCurrency, fallbackRate)` → number

Плюс окремо `buildPlanFactRows()` і `buildWorkerGroups()`. Кожна сама по собі
тестується.

### Bug FIN-03. «Чистий прибуток» — обманлива назва
**Файл:** `lib/finance.ts:253`, `components/finance/FinanceSummaryCards.tsx:29`
```ts
netProfit: revenue - materials - wages
```
`wages` уже включає частку власника (бо власник — це теж `Worker` в системі,
з ролю `OWNER`, і його `WorkerShare` рахується разом з усіма). Тобто
`netProfit` = ЩО ЗАЛИШИЛОСЬ НЕРОЗПОДІЛЕНИМ. Якщо `WorkerShare`-и закривають
весь pool — `netProfit = 0` за дизайном. Це не «прибуток власника».

**Виправлення (концептуальне):** Перейменувати на «Нерозподілено» / «Залишок
у касі», і додати окрему картку «Заробив власник» = sum(WorkerShare де
role=OWNER). Так буде зрозуміло для тата:
- Виручка
- Матеріали (витрати)
- Виплачено майстрам (sum шарів де role ≠ OWNER)
- **Заробив власник** (sum шарів де role = OWNER)
- Фонд «На мрію» (5% від виручки)
- Нерозподілено (контрольна цифра, має бути 0 при правильному закритті)

Це **6 карток** замість поточних 4, і вони реально відповідають бізнес-логіці.

### Bug FIN-04. Фонд «На мрію» не показується в розподілі виручки
**Файл:** `lib/finance.ts:17-36` (handleOrderClosed) і
`components/finance/RevenueBreakdown.tsx`
5% від кожного закритого замовлення йде в `DreamFund` (`handleOrderClosed`).
Але `RevenueBreakdown` показує тільки три сегменти: матеріали / зарплати /
«чистий заробіток». Куди дівається той «фонд» — невідомо. Тато побачить
розбіжність: «виручка 100к, матеріали 15к, зарплати 80к — а де 5к?»
**Виправлення:** Додати в `aggregateFinanceData` поле `dreamFundContribution`
(сума 5% по всіх закритих за період). Показати окремим сегментом у
RevenueBreakdown і окремою карткою у Summary.

### Bug FIN-05. `materials` для PlanFactTable не нормалізує валюту
**Файл:** `lib/finance.ts:191-208`
```ts
const plan = o.parts.reduce((s, p) => s + toN(p.estimatedPrice), 0);
const fact = o.parts.reduce((s, p) => s + ...)
```
**Слідство:** Якщо запчастина в USD — додасться як число без конверсії.
Колонки «План» і «Факт» у PlanFactTable показують неточну різницю.
**Виправлення:** Використати `toDisplay` per-part, як в інших агрегатах.

### Bug FIN-06. Закриті замовлення фільтруються по `updatedAt`, не по даті закриття
**Файл:** `lib/finance.ts:132-145`
```ts
where: {
  status: OrderStatus.CLOSED,
  updatedAt: { gte: range.from, lte: range.to },
},
```
**Слідство:** Якщо адмін відредагував щось у вже закритому замовленні
(наприклад, додав фото-акт через місяць), `updatedAt` зміститься, і
замовлення «переїде» в інший період. У звітах за минулий місяць раптом
зʼявиться/зникне.
**Виправлення:** Додати поле `Order.closedAt DateTime?`, фіксувати дату при
переході в статус CLOSED (через server action), і фільтрувати по ньому.

### Bug FIN-07. Немає перемикача валюти на самій сторінці /finance
**Спостереження:** Валюта зберігається в `Settings.displayCurrency`, тобто
глобально. Щоб подивитись фінанси в іншій валюті, треба йти в `/settings`
і змінювати там, потім вертатись назад. Незручно.
**Виправлення:** Додати кнопку перемикача валюти прямо в header /finance.
Зміна — через server action, перезавантажує сторінку з новою валютою.

### Bug FIN-08. Активні борги ігнорують POSTPONED-замовлення
**Файл:** `lib/finance.ts:146-150`
```ts
prisma.order.findMany({
  where: { status: { not: OrderStatus.CLOSED } },
  ...
})
```
**Слідство:** Замовлення зі статусом POSTPONED («Відкладено клієнтом») потрапляють
у «активні», тобто борги по них рахуються. Хоча клієнт фактично нічого не
винен — він просто поставив на паузу і поки що не платить.
**Виправлення:** Виключити POSTPONED зі статусів, по яких рахується борг.
(На дашборді це вже зроблено: `nonClosedS.filter((o) => o.status !== POSTPONED)` —
у `dashboard/page.tsx:97`. Треба ту саму логіку в finance.)

### Bug FIN-09. WorkerPayoutsTable не сортує і не групує OWNER окремо
**Файл:** `components/finance/WorkerPayoutsTable.tsx:35`
```ts
const totalWages = groups.reduce((s, g) => s + g.total, 0);
```
Все майстри в одному списку, тато стоїть просто як ще один. А йому корисно
бачити «скільки я заробив особисто» окремо від «скільки виплатив іншим».
**Виправлення:** Розділити на дві секції: «Заробив власник» (OWNER-роль)
і «Виплати майстрам» (інші ролі). Або хоча б візуально відмітити OWNER
відмінним кольором/бейджем.

---

## 2. Bookkeeping-модель (як має бути)

### 2.1. Що рахуємо

| Метрика                  | Формула                                                              | Звідки беремо                  |
|--------------------------|----------------------------------------------------------------------|--------------------------------|
| Виручка                  | Σ `orderTotal` по закритих за період                                | computeOrderTotals             |
| Витрати на матеріали     | Σ `parts.actualPrice ?? estimatedPrice` по закритих за період       | OrderPart                      |
| Виплачено майстрам       | Σ `WorkerShare.amount` де role ≠ OWNER по закритих за період        | WorkerShare                    |
| Заробив власник          | Σ `WorkerShare.amount` де role = OWNER по закритих за період        | WorkerShare                    |
| Фонд «На мрію»           | Σ `5% × orderTotal` по закритих за період                           | обчислюється                   |
| Нерозподілено (контрол.) | Виручка − Матеріали − Виплачено − Заробив власник − Фонд            | обчислюється                   |
| Активна заборгованість   | Σ `outstanding` по активних (не CLOSED, не POSTPONED)               | computeOrderTotals             |
| План/Факт по матеріалах  | per-order: (Σ actualPrice) − (Σ estimatedPrice)                     | OrderPart                      |

### 2.2. Період

Тип періоду визначається через query-параметри URL: `?period=month`, `day`,
`week`, `all`, `custom&from=...&to=...`. Це вже працює коректно (див.
`PeriodSelector.tsx`).

**Уточнення:** період має фільтрувати по полю **`Order.closedAt`** (нове),
не по `updatedAt`. Для активних замовлень (борги) період не застосовується —
борги завжди «зараз».

### 2.3. Валюта

Кожне замовлення зберігає `Order.currency` (валюта чека) +
`Order.baseExchangeRate`. Кожен запис у works/parts/workerShares — свою валюту
і свій курс (заморожений при створенні).

При агрегації по періоду:
- Для **історичних метрик** (виручка, матеріали, виплати за минулий період) —
  використовуються `exchangeRate`, заморожені на момент створення кожного запису.
  Це гарантує, що звіт за травень 2026 виглядає однаково сьогодні і через рік,
  незалежно від поточного курсу.
- Для **активних боргів** — використовується ПОТОЧНИЙ курс (fallbackRate).
  Борг — це майбутнє надходження, його коректно показувати в актуальному курсі.

Усі метрики перетворюються в `displayCurrency` ПІСЛЯ нормалізації, в одному
місці — `aggregateFinanceData`.

---

## 3. Архітектура агрегаційних функцій

Замість одного «бога-метода» `aggregateFinanceData` — розбити на 4 чисті
функції в `lib/finance.ts`:

```ts
// Спільний контекст для всіх агрегацій
interface AggregationCtx {
  displayCurrency: Currency;
  fallbackRate: number;  // поточний USD→UAH
}

// 1. Чисто прибуткова частина
export function aggregateClosedPeriod(
  closedOrders: OrderWithRelations[],
  ctx: AggregationCtx,
): {
  revenue: number;
  materials: number;
  wagesMasters: number;     // НЕ-OWNER
  wagesOwner: number;       // OWNER role
  dreamFundContribution: number;
  unallocated: number;      // контрольна цифра, має бути ~0
};

// 2. Активні борги
export function aggregateActiveDebt(
  activeOrders: OrderWithRelations[],
  ctx: AggregationCtx,
): { totalDebt: number; debtorsCount: number };

// 3. План/Факт по матеріалах для таблиці
export function buildPlanFactRows(
  closedOrders: OrderWithRelations[],
  ctx: AggregationCtx,
): PlanFactRow[];

// 4. Групування виплат по майстрах
export function buildWorkerGroups(
  closedOrders: OrderWithRelations[],
  ctx: AggregationCtx,
): WorkerGroup[];
```

Сторінка `app/(crm)/finance/page.tsx` викликає всі чотири паралельно і
передає результати у дочірні компоненти.

---

## 4. Як це малювати на фронті

### 4.1. Структура сторінки

```
┌─────────────────────────────────────────────┐
│ Header: «Фінанси»   [Місяць ▾]   [UAH/USD]  │  ← перемикачі періоду + валюти
├─────────────────────────────────────────────┤
│ 6 карток-сум:                                │
│ [Виручка] [Матеріали] [Виплачено]            │
│ [Власник] [Фонд мрії] [Нерозподілено]        │
├─────────────────────────────────────────────┤
│ Stacked bar (RevenueBreakdown):              │
│ ████ Матеріали | ████ Майстри | ████ Власник │
│ | ██ Фонд | ▪ Нерозподілено                  │
├─────────────────────────────────────────────┤
│ ⚠ Активна заборгованість: 107 830 ₴ (11 ос.)│
│ → перехід у /finance/debt                    │
├─────────────────────────────────────────────┤
│ 📊 План/Факт матеріалів (PlanFactTable)      │
├─────────────────────────────────────────────┤
│ 🎯 Фонд «На мрію» (DreamFundWidget)          │
├─────────────────────────────────────────────┤
│ 👷 Виплати майстрам (WorkerPayoutsTable)     │
│ 👤 Заробив власник (Owner subsection)        │
└─────────────────────────────────────────────┘
```

### 4.2. Які компоненти отримують які дані

| Компонент             | Props                                            | Звідки                       |
|-----------------------|--------------------------------------------------|------------------------------|
| `PeriodSelector`      | current, from, to                                | searchParams                 |
| `CurrencyToggle`      | current                                          | Settings.displayCurrency     |
| `FinanceSummaryCards` | 6 метрик з aggregateClosedPeriod + активний борг | aggregateClosedPeriod + aggregateActiveDebt |
| `RevenueBreakdown`    | revenue, materials, wagesMasters, wagesOwner, dreamFund, unallocated | aggregateClosedPeriod        |
| `ActiveDebtBanner`    | totalDebt, debtorsCount                          | aggregateActiveDebt          |
| `PlanFactTable`       | rows                                             | buildPlanFactRows            |
| `DreamFundWidget`     | funds[] + contribution за період                 | prisma + aggregateClosedPeriod |
| `WorkerPayoutsTable`  | groups (розділено на OWNER vs others)            | buildWorkerGroups            |

### 4.3. Перемикач валюти

Поточно валюта зберігається у `Settings.displayCurrency`. Зміна вимагає
переходу в /settings. Це **глобальна** перевага (всюди в апці використовується),
але **локально незручна**.

Рішення — на /finance додати локальний перемикач, який:
1. Викликає server action `setDisplayCurrency(currency)`.
2. Server action оновлює `Settings.displayCurrency` і викликає `revalidatePath("/")`.
3. Сторінка перевантажується з новими даними у новій валюті.

Це робить так, що зміна на /finance автоматично відбивається на дашборді,
у клієнтах, у замовленнях — що очікувано, бо `displayCurrency` глобальне.

Альтернатива (краща UX, але складніша): валюта тримається у cookie/localStorage,
синхронно з Settings, але користувач може тимчасово переключити на іншу
без зміни глобального стану. Поки що — обійтись простішим варіантом.

### 4.4. Drill-down на конкретне замовлення

Усі рядки в PlanFactTable, WorkerPayoutsTable, ActiveDebtBanner — кликабельні,
ведуть на `/orders/[id]`. Це вже працює.

---

## 5. Інтеграція з рештою системи

### 5.1. Закриття замовлення → оновлення фінансів

Коли замовлення переходить у статус CLOSED:
1. Server action `closeOrder(orderId)`:
   - Перевіряє інваріанти: orderTotal ≈ totalPaid + advancePayment (з допуском 0.01)
   - Якщо ні — попередження (не блокуємо, але логуємо).
   - Фіксує `Order.closedAt = new Date()` (нове поле).
   - Викликає `handleOrderClosed(orderId)` — додає 5% у DreamFund.
   - Заморожує всі `WorkerShare.exchangeRate` на поточний (бо це історія).
2. `revalidatePath("/finance")` і `/dashboard` — обидві сторінки оновлюються.

### 5.2. Платіж клієнта → оновлення активних боргів

Коли натискається +100/+500/+1000 або змінюється advancePayment:
1. Server action оновлює `Order.totalPaid` чи `Order.advancePayment`.
2. `revalidatePath("/finance")` і `/dashboard`.
3. `ActiveDebtBanner` пересчитується.

Це вже частково працює (revalidatePath є), просто треба переконатись що
сума там зменшується відразу.

### 5.3. Зміна `WorkerShare` → оновлення `wages` за період

Якщо в закритому замовленні правлять виплати майстрам — `wages` за період
має оновитись. Поточно `aggregateFinanceData` фетчить свіже, тож працює.
Просто переконатись, що відповідні `revalidatePath` стоять у server actions
для WorkerShare.

---

## 6. Acceptance criteria

Сценарій:
1. Створити 2 закриті замовлення в межах місяця:
   - **A:** orderTotal = 10 000 ₴, materials actual = 1 500 ₴, work = 8 500 ₴.
     Виплати: майстер Ілля 4 250 ₴ (50%), власник 4 250 ₴ (50%). Фонд: 500 ₴ (5%).
   - **B:** orderTotal = $200 (≈ 8 300 ₴), materials actual = $30 (≈ 1 245 ₴),
     work = $170 (≈ 7 055 ₴). Виплати: майстер 3 527,5 ₴ еквівалент,
     власник 3 527,5 ₴ еквівалент. Фонд: 415 ₴.
2. 1 активне замовлення з боргом 5 000 ₴ (не POSTPONED).
3. 1 POSTPONED замовлення з умовним «боргом» 3 000 ₴ — НЕ має враховуватись.

**Очікувано в UAH-режимі:**

| Метрика                  | Значення      | Поточне (баг)             |
|--------------------------|---------------|---------------------------|
| Виручка                  | 18 300 ₴      | 18 300 ₴ ✓ (бо UAH default)|
| Матеріали                | 2 745 ₴       | 2 745 ₴ ✓                  |
| Виплачено майстрам       | 7 777,5 ₴     | (об'єднано з власником)    |
| Заробив власник          | 7 777,5 ₴     | (немає окремої картки)     |
| Фонд «На мрію»           | 915 ₴         | (не показується)           |
| Нерозподілено            | ~0 ₴          | netProfit = 7 777,5 ₴ ✗   |
| Активна заборгованість   | 5 000 ₴       | 8 000 ₴ (включає POSTPONED)|

**Очікувано в USD-режимі** (курс ~41.5):

| Метрика                  | Значення      | Поточне (баг)             |
|--------------------------|---------------|---------------------------|
| Виручка                  | $441          | 18 300 (зі значком $) ✗    |
| Матеріали                | $66           | 2 745 (зі значком $) ✗     |
| ...                      | усі х/41.5    | усі без конверсії ✗        |

---

## 7. Промпт для Claude Code

````
Перероби сторінку /finance в проєкті nice.car.if (auto-crm-project) згідно
повної специфікації у файлі `екстразмін/05-storinka-finansiv.md`.

ПЕРЕДУМОВИ: впровадити ПЕРШИМИ файли 03 (computeOrderTotals) і
04 (наскрізна валюта). Цей блок 05 спирається на нову інфраструктуру.

ЩО ЗРОБИТИ:

1. ПРИЗМА (нове поле):
   - Додай `closedAt DateTime?` до моделі `Order`.
   - Згенеруй міграцію `npx prisma migrate dev --name add_closed_at`.

2. SERVER ACTION закриття замовлення:
   - У `app/(crm)/orders/[id]/actions.ts` функція, що міняє статус на CLOSED,
     має ставити `closedAt: new Date()`.
   - Викликати `handleOrderClosed(orderId)` для контрибуції в DreamFund.
   - Зробити перевірку інваріанту: orderTotal ≈ totalPaid + advancePayment;
     якщо не сходиться — кидати попередження через toast, але дозволяти.

3. РЕФАКТОР `lib/finance.ts`:
   - Видалити монолітну `aggregateFinanceData`.
   - Додати 4 чисті функції згідно розділу 3 файлу 05:
     * aggregateClosedPeriod(closedOrders, ctx) → { revenue, materials,
       wagesMasters, wagesOwner, dreamFundContribution, unallocated }
     * aggregateActiveDebt(activeOrders, ctx) → { totalDebt, debtorsCount }
     * buildPlanFactRows(closedOrders, ctx) → PlanFactRow[]
     * buildWorkerGroups(closedOrders, ctx) → WorkerGroup[]
   - Кожна функція використовує per-record toDisplay (вже наявна).
   - wagesOwner = sum WorkerShare де role=OWNER (через roleSnapshot).
   - dreamFundContribution = sum(orderTotal × 0.05) — обчислюється з закритих
     замовлень за період.
   - unallocated = revenue − materials − wagesMasters − wagesOwner − dreamFundContribution.
     Має бути близько 0 у нормальних умовах.

4. ОНОВЛЕННЯ `app/(crm)/finance/page.tsx`:
   - Дочитай `displayCurrency` зі Settings (вже є на рядку 37).
   - Дочитай `fallbackRate` через `getCurrentRate()`.
   - Винеси фетч замовлень окремо: getClosedOrders(range), getActiveOrders().
   - getClosedOrders фільтрує по `closedAt` (НЕ `updatedAt`).
   - getActiveOrders фільтрує: status NOT IN (CLOSED, POSTPONED).
   - Виклич усі 4 нові функції паралельно через Promise.all.
   - Прокинь результати у відповідні компоненти.

5. НОВИЙ КОМПОНЕНТ `components/finance/CurrencyToggle.tsx`:
   - Кнопка-перемикач UAH ↔ USD (показує поточну валюту і значок-стрілку).
   - При кліку викликає новий server action `setDisplayCurrency(c: Currency)`
     у `app/(crm)/settings/actions.ts`.
   - Server action оновлює Settings.displayCurrency + revalidatePath("/").
   - Розмістити в header /finance поряд з PeriodSelector.

6. ОНОВЛЕННЯ `components/finance/FinanceSummaryCards.tsx`:
   - Замість 4 карток зробити 6 згідно розділу 4.1 файлу 05:
     Виручка | Матеріали | Виплачено майстрам | Заробив власник |
     Фонд «На мрію» | Нерозподілено
   - Прийняти всі 6 метрик + displayCurrency як props.
   - «Нерозподілено» при ≈0 виводити сірим/маленьким; при значущій сумі —
     виділити червоним як попередження.

7. ОНОВЛЕННЯ `components/finance/RevenueBreakdown.tsx`:
   - Додати 4-й і 5-й сегменти у stacked bar:
     Матеріали | Майстри | Власник | Фонд мрії | Нерозподілено
   - Кольори: orange / blue / green / purple / gray
   - Легенда — 5 рядків.

8. НОВИЙ КОМПОНЕНТ `components/finance/ActiveDebtBanner.tsx`:
   - Картка з сумою боргу і кількістю боржників.
   - Лінк "Деталі →" на майбутню сторінку /finance/debt (або поки що на
     dashboard секцію DebtorsList — реюз).

9. ОНОВЛЕННЯ `components/finance/WorkerPayoutsTable.tsx`:
   - Розділити groups на 2 секції: OWNER (нагорі, окремо) і ІНШІ.
   - У header header показати «Виплати майстрам» і «Заробив власник» окремими
     підсумками.

10. ОНОВЛЕННЯ `components/finance/PlanFactTable.tsx`:
    - Передати displayCurrency в усі formatMoney.
    - Числа `planMaterials` і `factMaterials` мають приходити вже нормалізовані
      з `buildPlanFactRows` (через toDisplay per-part). Не робити власної конверсії.

11. ТЕСТИ:
    - У `tests/unit/finance.test.ts` (новий файл або розширити існуючий) додати
      тестові кейси:
      * aggregateClosedPeriod з 1 UAH + 1 USD замовленням → перевірити що revenue
        у displayCurrency коректний.
      * aggregateActiveDebt з 3 активними + 1 POSTPONED → POSTPONED не враховується.
      * buildPlanFactRows з мішаними валютами parts → diff коректний.
      * unallocated близько 0 коли всі шари розподілені.

ВЕРИФІКАЦІЯ:
- npm run build (без помилок)
- npm test (всі тести зелені)
- Сценарій з розділу 6 файлу 05: створити 2 закриті замовлення (UAH + USD)
  + 1 активне + 1 POSTPONED, звірити числа з таблицею в розділі 6.
- Перемкнути валюту в /finance: всі суми пропорційні курсу, не лише значок.
- POSTPONED не у боргах.
- DreamFund поповнюється на 5% від виручки.
- Зміна періоду перерахунковує всі картки.
- Унікальне закриття замовлення оновлює all sections без перезавантаження.

ВАЖЛИВО:
- НЕ міняй назву «Чистий прибуток» на «Нерозподілено» якщо це психологічно
  важко для замовника — допиши пояснювальний підпис під карткою
  («Має бути близько 0 — це контрольна сума»).
- НЕ ламай /dashboard — DebtorsList там використовує дані, які формуються
  у dashboard/page.tsx; його логіка БУЛА оновлена в файлі 04. Тут — лише
  /finance.
- POSTPONED-логіку перевір: на дашборді вона ЕЛЕМЕНТАРНО має не входити в
  борги; тут — те саме правило.
````

---

## 8. Що увійде в пояснювальну записку

Цей файл — фундамент для розділу **«Фінансовий звіт як аналітичний модуль»**.
Структура для записки:

- **Бухгалтерська модель** (розділ 2) — формалізація рахункового плану
  специфічно для авто-сервісу: revenue, materials, labor pool, дрім-фонд,
  нерозподілене. Класичний приклад domain modeling.
- **Розділення відповідальності функцій** (розділ 3) — антипатерн «god-method»
  vs набір чистих функцій. Канонічний рефакторинг, що добре звучить на захисті.
- **Заморожування історичних курсів vs поточний для боргів** (розділ 2.3) —
  принцип immutable accounting (як в QuickBooks і будь-якій бухгалтерській
  системі). Сильний теоретичний матеріал.
- **Інтеграція з життєвим циклом замовлення** (розділ 5) — як cross-module
  події (закриття замовлення, платіж, зміна виплати) поширюються по системі.
- **Контрольна сума `unallocated`** — приклад self-checking design: число,
  яке має бути 0, дозволяє швидко виявляти баги в логіці розподілу.
- **Регресійний набір тестів** (розділ 7 пункт 11) — приклад unit-test
  стратегії для агрегаційної логіки. Особливо цінно для розділу «верифікація».
