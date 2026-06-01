# Екстра-зміна #12 — Вибір валюти у формах (замовлення, фінанси, виплати майстрам)

**Дата:** 2026-06-01
**Контекст:** При створенні замовлення (`/orders/new`) у формі **неможливо обрати
валюту** — поля «Орієнтовна ціна» і «Завдаток» жорстко підписані `(₴)`, хоча
прайс над ними наведений у **доларах** (`260–500 $`). Через це користувач вводить
число, думаючи про USD, а воно зберігається як UAH. Цей файл — повний аудит усіх
місць застосунку, де відбуваються операції з валютою, з переліком де вибір/конверсія
**відсутні або працюють некоректно**, плюс точні правки.

> Передумова: файли `03-finansova-lohika.md`, `04-borh-i-valyuta-naskriznyy.md`,
> `05-storinka-finansiv.md` уже виправили **відображення** сум (наскрізна
> нормалізація через `computeOrderTotals` + `convert`). Цей файл стосується
> **вводу** — форм, де користувач задає суми, і де вибір валюти або немає, або
> запис у БД відбувається з неправильною валютою/курсом.

---

## 0. Як влаштована валюта в проєкті (щоб не зламати архітектуру)

- **Enum `Currency`** = `USD | UAH` (`prisma/schema.prisma:14`).
- Кожен грошовий запис зберігає **власну валюту** + **курс на момент запису**:
  - `Order.currency` (default `UAH`), `Order.baseExchangeRate`
  - `OrderWork.currency` + `OrderWork.exchangeRate`
  - `OrderPart.currency` + `OrderPart.exchangeRate`
  - `WorkerShare.currency` + `WorkerShare.exchangeRate`
- `Settings.defaultCurrency` (default `USD`) — валюта за замовчуванням для нових
  записів. `Settings.displayCurrency` (default `USD`) — валюта відображення (тогл).
- **Єдина точка правди для обчислень** — `computeOrderTotals()` у
  `lib/finance-pure.ts`. Вона нормалізує кожен запис до `displayCurrency` через
  `toDisplay(amount, recordCurrency, exchangeRate, displayCurrency, fallbackRate)`.
- `lib/currency.ts`:
  - `convert(money, toCurrency, rate)` — конвертує одну суму.
  - `formatMoney(amount, currency)` — **ЛИШЕ форматує символ**, не конвертує.
- UI-компонент вибору валюти з підказкою конверсії вже існує:
  **`components/ui/MoneyInput.tsx`** (тогл `$ / ₴` + плашка «Конвертувати? Так/Ні»).
  Його вже використовують `WorksConstructor` і `PartsChecklist` — і там вибір
  валюти працює коректно. **Форми нижче — ті, де його забули застосувати.**

**Головне правило для всіх правок:** там, де користувач вводить суму, він має
бачити тогл валюти (`MoneyInput`), а server action — зберігати і `currency`, і
`exchangeRate` (поточний курс на момент запису, через `getCurrentRate()`). Ніколи
не змішувати суму в `displayCurrency` з сумою в валюті запису в одній арифметиці.

---

## 1. Інвентаризація: де операції з валютою працюють, а де ні

| # | Місце | Вибір валюти | Конверсія при відображенні | Статус |
|---|-------|--------------|----------------------------|--------|
| 1 | `WorksConstructor` (роботи) | ✅ `MoneyInput` | ✅ `convert` | OK |
| 2 | `PartsChecklist` (запчастини) | ✅ `MoneyInput` | ✅ `convert` | OK |
| 3 | `CurrencyToggle` (глобальний тогл) | ✅ | — | OK |
| 4 | **`NewOrderForm` (ціна, завдаток)** | ❌ немає, хардкод `₴` | ❌ | **BUG-A** |
| 5 | **`FinanceBlock` (ціна, завдаток, оплачено)** | ❌ немає | ❌ змішує валюти в боргу | **BUG-B** |
| 6 | **`WorkerShares` (фіксована сума виплати)** | ❌ немає, хардкод `₴` | ❌ конфлікт display/record | **BUG-C** |
| 7 | `createOrderWithPhotos` action | ❌ не пише `currency` | — | **BUG-A** |
| 8 | `updateFinance` action | ❌ не чіпає `currency` | — | **BUG-B** |
| 9 | `updateWorkerShareAmount` / `applyShareTemplate` / `addWorkerShareFromDirectory` | ❌ хардкод/ігнор `currency`, не оновлює `exchangeRate` | — | **BUG-C** |

---

## 2. BUG-A — Форма створення замовлення не дозволяє обрати валюту

**Файли:** `components/orders/NewOrderForm.tsx`, `app/(crm)/orders/new/actions.ts`

### 2.1 Що не так
1. Поля `estimatedPrice` і `advancePayment` — це звичайні `<Input type="number">`
   з підписами `Орієнтовна ціна (₴)` / `Завдаток (₴)`. Тогла валюти немає.
2. Прайс-довідник (`PRICE_LIST`) показує діапазони в **доларах** (`{range} $`),
   тобто інтерфейс одночасно натякає на USD і підписує поле як UAH — пряме
   джерело помилки користувача.
3. `createOrderWithPhotos` (actions.ts) приймає `estimatedPrice`/`advancePayment`
   як голі числа і **не передає `currency`** у `prisma.order.create` → запис
   завжди отримує дефолт схеми `UAH`, навіть якщо майстер мав на увазі USD.
   `baseExchangeRate` зберігається, але без валюти він беззмістовний.

### 2.2 Правка форми (`NewOrderForm.tsx`)
- Додати локальний стан валюти, ініціалізований із `Settings.defaultCurrency`.
  Прокинути `defaultCurrency` у компонент пропом зі сторінки
  `app/(crm)/orders/new/page.tsx` (прочитати `prisma.settings.findUnique`), і
  курс через `useExchangeRate()` або проп.
- Замінити обидва числові `<Input>` на `MoneyInput`:
  ```tsx
  // стан
  const [estimatedPrice, setEstimatedPrice] = useState(0);
  const [advancePayment, setAdvancePayment] = useState(0);
  const [orderCurrency, setOrderCurrency] = useState<Currency>(defaultCurrency);

  // у рендері (замість двох Input):
  <MoneyInput value={estimatedPrice} currency={orderCurrency} currentRate={rate}
    onChange={(v, c) => { setEstimatedPrice(v); setOrderCurrency(c); }} />
  <MoneyInput value={advancePayment} currency={orderCurrency} currentRate={rate}
    onChange={(v, c) => { setAdvancePayment(v); setOrderCurrency(c); }} />
  ```
  > Рішення: ціна і завдаток замовлення — одна валюта замовлення. Достатньо
  > **одного** `orderCurrency` на секцію, спільного для обох `MoneyInput`.
- Прибрати хардкод `(₴)` з лейблів — підпис має відображати поточну валюту або
  бути нейтральним («Орієнтовна ціна», «Завдаток»), бо валюта вже видно в тоглі.
- `handleSave`: передати `currency: orderCurrency` у `createOrderWithPhotos`,
  замість `parseFloat(...)` віддавати вже числовий стан.
- (Косметика проти плутанини) Прайс `PRICE_LIST` показує `$` — лишити `$`, бо
  ціни реально в USD; тоді дефолтну валюту нового замовлення варто лишити =
  `Settings.defaultCurrency` (USD), щоб прайс і поле збігались.

### 2.3 Правка action (`app/(crm)/orders/new/actions.ts`)
```ts
export async function createOrderWithPhotos(data: {
  /* ...існуючі поля... */
  estimatedPrice: number;
  advancePayment: number;
  currency?: Currency;          // ← додати
  photoUrls: string[];
}): Promise<{ orderId: string }> {
  // ...
  const baseExchangeRate = await getCurrentRate();
  const order = await prisma.order.create({
    data: {
      /* ...існуюче... */
      estimatedPrice: data.estimatedPrice,
      advancePayment: data.advancePayment,
      currency: data.currency ?? Currency.UAH,   // ← пишемо валюту
      baseExchangeRate,
    },
  });
  // ...
}
```
Імпортувати `Currency` з `@prisma/client` у цьому файлі.

---

## 3. BUG-B — Картка «Фінанси» замовлення: немає вибору валюти + помилка в боргу

**Файл:** `components/orders/OrderDetail/FinanceBlock.tsx`,
`app/(crm)/orders/[id]/actions.ts` (`updateFinance`).

### 3.1 Що не так
1. Поля «Орієнтовна ціна», «Завдаток», «Оплачено» — голі `<Input type="number">`
   без тогла валюти. Майстер не може ні задати, ні змінити валюту цих сум.
2. Числа в інпутах беруться напряму з `Number(order.estimatedPrice)` тощо — це
   значення у **валюті замовлення**, але показуються **без конверсії** і без
   позначення валюти. Якщо `displayCurrency` ≠ `order.currency`, на екрані
   суміш: розбивка зверху (works/parts) — у `displayCurrency`, а редаговані поля
   — у валюті замовлення, з однаковими цифрами без позначок.
3. **Критична арифметична помилка:**
   ```ts
   const debt = Math.max(0, totals.orderTotal - localPaid - localAdv);
   ```
   `totals.orderTotal` уже нормалізований у `displayCurrency`, а `localPaid` /
   `localAdv` — голі числа з інпутів у валюті замовлення. Віднімання
   `USD − UAH` дає беззмістовний борг, коли валюти різні.
4. Підпис `Платіж у валюті замовлення ({currency ?? "UAH"})` — лише читає поле,
   але змінити валюту немає як.

### 3.2 Правка
Рішення: завдаток і оплата ведуться у **валюті замовлення** (`order.currency`).

- Додати селектор валюти замовлення (`MoneyInput`) для полів «Орієнтовна ціна»,
  «Завдаток», «Оплачено». Тримати локальний стан `orderCurrency`,
  ініціалізований з `order.currency`. При зміні валюти показувати плашку
  «Конвертувати?» (вона вже вбудована в `MoneyInput`).
- **Виправити розрахунок боргу** — рахувати в одній валюті. Найнадійніше — взяти
  готове `totals.outstanding` (його коректно обчислює `computeOrderTotals`, бо
  там `advance`/`paid` проходять через `toDisplay`). Для live-перерахунку під час
  набору — конвертувати локальні поля в `displayCurrency`:
  ```ts
  import { convert } from "@/lib/currency";
  const { displayCurrency, rate } = useCurrency();
  const paidInDisplay = convert({ amount: localPaid, currency: orderCurrency }, displayCurrency, rate ?? undefined);
  const advInDisplay  = convert({ amount: localAdv,  currency: orderCurrency }, displayCurrency, rate ?? undefined);
  const debt = Math.max(0, totals.orderTotal - paidInDisplay - advInDisplay);
  ```
- Інпути показувати у валюті запису, з позначкою валюти (через `MoneyInput`),
  а не голі цифри.

### 3.3 Правка action (`updateFinance`)
```ts
export async function updateFinance(
  orderId: string,
  data: { totalPaid: number; advancePayment: number; estimatedPrice?: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  // якщо валюта змінилась — оновити baseExchangeRate (заморозити поточний курс)
  let rateUpdate: Record<string, unknown> = {};
  if (data.currency) {
    const cur = await prisma.order.findUnique({ where: { id: orderId }, select: { currency: true } });
    if (cur && cur.currency !== data.currency) {
      rateUpdate = { baseExchangeRate: await getCurrentRate() };
    }
  }
  await prisma.order.update({
    where: { id: orderId },
    data: {
      totalPaid: data.totalPaid,
      advancePayment: data.advancePayment,
      ...(data.estimatedPrice !== undefined ? { estimatedPrice: data.estimatedPrice } : {}),
      ...(data.currency ? { currency: data.currency } : {}),
      ...rateUpdate,
    },
  });
  revalidate(orderId);
}
```
Імпортувати `getCurrentRate` (вже є) і `Currency` у файлі actions (вже є).

---

## 4. BUG-C — Виплати майстрам: фіксована сума без вибору валюти + псування даних

**Файл:** `components/orders/OrderDetail/WorkerShares.tsx`,
`app/(crm)/orders/[id]/actions.ts`
(`updateWorkerShareAmount`, `updateWorkerSharePercent`,
`addWorkerShareFromDirectory`, `applyShareTemplate`, `updateWorkerShare`).

### 4.1 Що не так
1. Інпут фіксованої суми (`localAmt`) — голий `<Input type="number">` з
   `placeholder="₴"`, тогла валюти немає. Кнопка перемикання режиму теж жорстко
   підписана `₴`.
2. `localAmt` ініціалізується з `Number(share.amount)` (валюта запису, без
   конверсії), а поряд `computedAmount` форматується в `displayCurrency` →
   розбіжність між тим, що в полі, і тим, що показано як «= …».
3. У `%`-режимі `computedAmount = base * pct / 100`, де `base` — у
   `displayCurrency`. При `toggleMode`/`handleBlurAmt` це число летить у
   `onUpdateAmount` → `updateWorkerShareAmount`, який пише `amount` **без**
   `currency`/`exchangeRate`. Тобто число в USD зберігається в запис із
   `currency = UAH` → потім інтерпретується як гривні. **Псування даних.**
4. `addWorkerShareFromDirectory` і `applyShareTemplate` рахують `base` у
   `Currency.UAH` і пишуть `currency: Currency.UAH` жорстко; `applyShareTemplate`
   при оновленні існуючого share оновлює `amount`, але не приводить його до
   валюти/курсу того share (а він міг бути USD).

### 4.2 Правка компонента
- Замінити голий інпут суми на `MoneyInput` з власним станом валюти share
  (ініціалізувати з `share.currency`, дефолт — `displayCurrency`).
- У `%`-режимі сума розподілу рахується від `base` (валюта = `displayCurrency`),
  тож зберігати share саме в `displayCurrency` і передавати її валюту в action.
- Прибрати хардкод `₴` з кнопки тогла й `placeholder`.

### 4.3 Правка actions
Усі функції мають приймати й зберігати `currency` + `exchangeRate`:
```ts
export async function updateWorkerShareAmount(
  shareId: string, orderId: string, amount: number, currency?: Currency
) {
  await requireAuth();
  const rate = currency ? await getCurrentRate() : undefined;
  await prisma.workerShare.update({
    where: { id: shareId },
    data: { sharePercent: null, amount, ...(currency ? { currency, exchangeRate: rate } : {}) },
  });
  revalidate(orderId);
}
```
- `updateWorkerSharePercent`: рахуй `base` у валюті, в якій зберігатимеш share,
  і запиши `currency` + `exchangeRate`.
- `addWorkerShareFromDirectory`: прибрати хардкод `Currency.UAH` — приймати
  `currency` (дефолт `displayCurrency`/`Settings.defaultCurrency`), рахувати
  `base` у тій самій валюті, писати `exchangeRate: rate`.
- `applyShareTemplate`: при оновленні існуючого share узгодити
  `currency`/`exchangeRate` із базою розподілу (рекомендується рахувати базу і
  писати share у `Settings.defaultCurrency`, заморожуючи поточний курс).

---

## 5. Дрібніші перевірки (зробити заодно)

- `lib/currency.ts: convert()` має фолбек курсу `|| 41` — лишити як аварійний,
  але переконатися, що в усі виклики з форм передається реальний `currentRate`
  (через `useCurrency().rate` або `useExchangeRate()`), щоб 41 не «вистрілював».
- Узгодити дефолти: схема ставить `Order/Work/Part/Share.currency = UAH`, а
  `Settings.defaultCurrency = USD`. Для нових записів у всіх формах брати дефолт
  саме з `Settings.defaultCurrency`, а не з хардкоду `UAH`.
- Після правок прогнати юніт-тести валюти/фінансів і додати кейс: «створення
  замовлення в USD зберігає `currency=USD` і коректний борг при `displayCurrency=UAH`».

---

## 6. Чек-лист приймання (ручна перевірка в UI)

1. `/orders/new`: у полі ціни видно тогл `$ / ₴`; зміна валюти показує плашку
   «Конвертувати?»; збережене замовлення має правильну `currency` в БД.
2. Картка замовлення → «Фінанси»: можна змінити валюту замовлення; борг
   рахується правильно і не «стрибає» при переключенні глобального тогла.
3. Виплати майстрам: фіксовану суму можна задати в $ або ₴; після збереження і
   перезавантаження сума й валюта збігаються (немає множення/ділення на курс).
4. Глобальний тогл `$ ↔ ₴` (`CurrencyToggle`): усі суми (роботи, запчастини,
   завдаток, оплата, борг, виплати) перераховуються однаково й узгоджено.
5. Роботи/запчастини (вже працювали) — не зламані регресією.

---

# 🔧 ПРОМТ ДЛЯ CLAUDE CODE (копіювати цілком)

> Працюй у репозиторії auto-crm-project (Next.js App Router + Prisma + TS).
> Задача: дати можливість обирати валюту скрізь, де користувач вводить грошові
> суми, і прибрати помилки конверсії. Дотримуйся наявної архітектури:
> `MoneyInput` для вводу з тоглом валюти, `computeOrderTotals`/`convert`/
> `toDisplay` для обчислень, кожен запис зберігає власні `currency` +
> `exchangeRate` (поточний курс через `getCurrentRate()`). `formatMoney` нічого
> не конвертує — лише форматує. Зроби такі правки:
>
> **1) Форма створення замовлення.** У `components/orders/NewOrderForm.tsx`
> заміни голі числові інпути «Орієнтовна ціна (₴)» і «Завдаток (₴)» на компонент
> `MoneyInput` зі спільним станом валюти `orderCurrency` (дефолт — з
> `Settings.defaultCurrency`, прокинь його та поточний курс зі сторінки
> `app/(crm)/orders/new/page.tsx`). Прибери хардкод `(₴)` з лейблів. У
> `handleSave` передай `currency: orderCurrency` в `createOrderWithPhotos`.
> У `app/(crm)/orders/new/actions.ts` додай параметр `currency?: Currency` і
> запиши `currency: data.currency ?? Currency.UAH` у `prisma.order.create`
> (імпортуй `Currency`).
>
> **2) Картка «Фінанси» замовлення.** У
> `components/orders/OrderDetail/FinanceBlock.tsx` додай вибір валюти замовлення
> (через `MoneyInput`) для полів «Орієнтовна ціна», «Завдаток», «Оплачено».
> ВИПРАВ розрахунок боргу: зараз `debt = totals.orderTotal - localPaid -
> localAdv` змішує `displayCurrency` з валютою замовлення. Перед відніманням
> конвертуй `localPaid`/`localAdv` у `displayCurrency` через `convert(...)` з
> поточним курсом, або використай готове `totals.outstanding`. У
> `app/(crm)/orders/[id]/actions.ts` розшир `updateFinance` параметром
> `currency?: Currency`; при зміні валюти онови `baseExchangeRate` поточним
> курсом і запиши `currency`.
>
> **3) Виплати майстрам.** У
> `components/orders/OrderDetail/WorkerShares.tsx` заміни голий інпут фіксованої
> суми на `MoneyInput` з власним станом валюти (дефолт — `displayCurrency`),
> прибери хардкод `₴` з кнопки тогла і placeholder. У
> `app/(crm)/orders/[id]/actions.ts` зроби, щоб `updateWorkerShareAmount`,
> `updateWorkerSharePercent`, `addWorkerShareFromDirectory`, `applyShareTemplate`
> приймали/зберігали `currency` і оновлювали `exchangeRate` (через
> `getCurrentRate()`); прибери жорсткий `Currency.UAH`. База розподілу і
> збережена сума мають бути в одній валюті — рекомендую `Settings.defaultCurrency`
> (або `displayCurrency`), із заморозкою поточного курсу.
>
> **4) Узгодження дефолтів.** Скрізь, де створюється новий грошовий запис, бери
> дефолтну валюту з `Settings.defaultCurrency`, а не з хардкоду `UAH`. Переконайся,
> що у всі форми передається реальний поточний курс (`useCurrency().rate` або
> `useExchangeRate()`), щоб аварійний фолбек `|| 41` у `convert()` не спрацьовував.
>
> **Тести й перевірка.** Онови/додай юніт-тести у `tests/unit/currency.test.ts`
> та `tests/unit/finance.test.ts`: створення замовлення в USD зберігає
> `currency=USD`; борг коректний при `displayCurrency=UAH`; виплата майстру в $
> після збереження не множиться/ділиться на курс. Запусти `npm run test:unit` і
> переконайся, що всі тести (зараз 94) проходять, нові — теж. Зроби `tsc`/lint.
> Не ламай наявну логіку робіт і запчастин (`WorksConstructor`, `PartsChecklist`)
> — там вибір валюти вже працює, використовуй їх як зразок.
