# Екстра-зміна #04 — Борг клієнтів і наскрізна валютна логіка

**Дата:** 2026-05-26
**Контекст:** На дашборді та у списку клієнтів сума «Борг клієнтів» при
переключенні валюти змінює лише значок ($ ↔ ₴), а саме число лишається
тим самим (`107 830 ₴` і `$107,830` — це не однакові суми). Цей файл —
продовження `03-finansova-lohika.md`: розглядає **наскрізне відображення
сум** по всьому застосунку, не лише в картці одного замовлення.

> Передумова: файл `03-finansova-lohika.md` уже описав корінь проблеми —
> `calcOrderTotal` і `formatMoney` не нормалізують валюту. Тут — повна
> інвентаризація місць, де ця проблема проступає, плюс інтеграція з логікою
> оплат клієнтів.

---

## 1. Точне відтворення проблеми

На скріншотах:
- USD-режим: «Борг клієнтів **$107,830**», Ірина Мельник **$24,980**, тощо.
- UAH-режим: «Борг клієнтів **107 830 ₴**», Ірина Мельник **24 980 ₴**, тощо.

**Очікувано** при курсі ~41.5: якщо в БД 107 830 UAH — то в USD має показувати
≈ $2,598. Якщо в БД $2,598 — то в UAH має показувати ≈ 107 830. Не обидва
рівно 107 830 з різним значком.

---

## 2. Корінь проблеми (одним абзацом)

Функція `formatMoney(amount, currency)` у `lib/currency.ts:47-66` — це
**виключно форматер символу і роздільників**. Вона не виконує жодної конверсії.
`formatMoney(107830, USD)` віддає `"$107,830"`, `formatMoney(107830, UAH)` —
`"107 830 ₴"`. Виклик «передаємо `displayCurrency` у `formatMoney`» нічого не
конвертує — він лише змінює значок.

Щоб число справді змінилось, треба ДО `formatMoney` пропустити суму через
`convert(...)` або через нову функцію `computeOrderTotals` (див. файл 03), яка
вже нормалізує до `displayCurrency`. Зараз у дев'яти місцях коду цей крок
пропущений.

---

## 3. Інвентаризація місць, де баг проступає

Усі знайдені точки виклику `calcOrderTotal` + `formatMoney` без проміжної
конверсії:

| #  | Файл                                                       | Що показує            | Як ламається                                                                        |
|----|------------------------------------------------------------|----------------------|-------------------------------------------------------------------------------------|
| 1  | `app/(crm)/dashboard/page.tsx:96-110`                      | Список боржників     | `debt = total − paid − advance` рахується наївно, без per-record конверсії          |
| 2  | `app/(crm)/dashboard/page.tsx:187`                         | StatCard «Боржників» | Хардкод `₴` в `sub`-рядку (`${...} ₴`), завжди UAH                                  |
| 3  | `app/(crm)/dashboard/page.tsx:115-126`                     | Виторг за тиждень    | `weekRevenue` — наївна сума, потім `formatMoney(..., displayCurrency)`             |
| 4  | `components/dashboard/DebtorsList.tsx:34, 40, 55`          | Сума і ряди боргу    | `formatMoney(d.debt, displayCurrency)` змінює лише значок                          |
| 5  | `components/clients/ClientCard.tsx:39-48, 96`              | Картка клієнта       | `calcOrderTotal` + хардкод `Currency.UAH` у `formatMoney`                          |
| 6  | `components/clients/ClientProfile.tsx:202-207, 374, 402`   | Профіль клієнта      | `debt` рахується наївно, виводиться через `formatMoney(..., displayCurrency)`      |
| 7  | `components/clients/VehicleHistory.tsx`                    | Історія по авто      | Те саме (calcOrderTotal без конверсії)                                              |
| 8  | `components/orders/OrderCard.tsx`                          | Карточка в списку    | Те саме                                                                             |
| 9  | `components/dashboard/RecentClosedOrders.tsx:47-50`        | Закриті за тиждень   | Те саме                                                                             |
| 10 | `components/orders/OrderDetail/FinanceBlock.tsx:40-46`     | Фінанси замовлення   | (вже в файлі 03 як F-02)                                                            |
| 11 | `components/orders/OrderDetail/WorkerShares.tsx:547-554`   | Зарплати майстрів    | (вже в файлі 03 як F-03)                                                            |
| 12 | `lib/finance.ts:155` (всередині `aggregateFinanceData`)    | Сторінка /finance    | (вже в файлі 03 як F-06)                                                            |
| 13 | `components/finance/FinanceSummaryCards.tsx:52`            | Картки на /finance   | Те саме                                                                             |

Тобто **усі види «грошей»** у застосунку, окрім `WorksConstructor` (де
конверсія робиться правильно через `convert()`), мають той самий дефект.

---

## 4. Як це повʼязано з логікою оплат клієнтів

Тут починається друга частина проблеми, яку важко побачити одразу.

### 4.1. Валюта оплати vs валюта замовлення

`Order.totalPaid` і `Order.advancePayment` — це поля рівня замовлення.
Логічно — це гроші, які **клієнт фактично передав**. У якій валюті він їх
передав? Зараз у БД немає поля «валюта платежу». Платежі неявно вважаються
у `Order.currency`.

Це **робоча** модель за умови, що:
- Замовлення завжди ведеться в одній валюті (`Order.currency` фіксована).
- Клієнт платить саме в цій валюті.
- Якщо платить в іншій — касир переводить за курсом і вносить у валюті
  замовлення.

Це нормальна бухгалтерська практика. Не плутати з валютою окремих робіт/
запчастин (`OrderWork.currency`, `OrderPart.currency`) — там валюта показує,
**у чому ми ОЦІНЮЄМО позицію** (наприклад, фарба з США в USD), а не валюту
розрахунку з клієнтом.

### 4.2. Що з цього випливає для боргу

Борг замовлення в його ВЛАСНІЙ валюті:
```
debtInOrderCurrency =
  normalizeToOrderCurrency(sum(works) + sum(parts)) − totalPaid − advancePayment
```

Де `normalizeToOrderCurrency` бере кожен `OrderWork`/`OrderPart` зі своїм
`currency` + `exchangeRate` і приводить до `Order.currency` через його
`baseExchangeRate`.

Борг у валюті відображення (`displayCurrency`):
```
debtInDisplayCurrency = convert(debtInOrderCurrency, Order.currency, displayCurrency, currentRate)
```

### 4.3. Що з цього випливає для агрегатів «по всіх клієнтах»

Загальний борг по всіх клієнтах **не можна** сумувати у валютах замовлень
напряму. Спочатку конвертуємо кожен борг у спільну валюту (`displayCurrency`),
потім сумуємо:

```ts
const totalDebt = debtors.reduce(
  (sum, d) => sum + convert(
    { amount: d.debtInOrderCurrency, currency: d.orderCurrency, exchangeRate: d.baseExchangeRate },
    displayCurrency,
    currentRate
  ),
  0
);
```

Це принципова відмінність від поточного коду, який просто сумує raw числа.

---

## 5. Цілісна архітектура (як має бути)

### 5.1. Три рівні валют у системі

| Рівень          | Поле                                          | Призначення                                                  |
|-----------------|-----------------------------------------------|--------------------------------------------------------------|
| Запис           | `OrderWork.currency`, `OrderPart.currency`    | Як оцінюється конкретна позиція (фарба в USD, шпаклівка в UAH)|
| Замовлення      | `Order.currency`, `Order.baseExchangeRate`    | У чому ведеться розрахунок з клієнтом (валюта чека)         |
| Відображення    | `Settings.displayCurrency` (через `CurrencyProvider`) | У чому користувач бачить числа в UI                          |

### 5.2. Конвейєр обчислення (доповнення до файлу 03)

Розширити `computeOrderTotals` (з файлу 03) і додати paralелл по списках:

```ts
// lib/finance.ts

// Існуюча (з файлу 03)
export function computeOrderTotals(order, displayCurrency, fallbackRate): OrderTotals;

// Нова
export function computeOrderDebt(
  order: OrderWithRelations,
  displayCurrency: Currency,
  fallbackRate: number,
): {
  debtInOrderCurrency: number;
  debtInDisplayCurrency: number;
  orderCurrency: Currency;
  isPaid: boolean;
};

// Нова — для дашборду і списку клієнтів
export function aggregateDebtors(
  orders: OrderWithRelations[],
  displayCurrency: Currency,
  fallbackRate: number,
): {
  debtors: Array<{ orderId: string; debt: number; client: ...; vehicle: ... }>;
  totalDebt: number;  // у displayCurrency
};
```

`aggregateDebtors` — те, що має викликати `dashboard/page.tsx` замість того,
щоб мапити інлайн через `calcOrderTotal`.

### 5.3. Що ще треба переписати

- `lib/utils.ts:calcOrderTotal` — позначити DEPRECATED, не видаляти (тести
  ще використовують).
- `lib/utils.ts:calcDebt` — те саме.
- Усі 13 місць з таблиці в розділі 3 — перевести на нові функції.
- `formatMoney` — НЕ чіпати її логіку, але додати JSDoc з попередженням:
  «Ця функція лише форматує. Перед нею ОБОВʼЯЗКОВО викликайте convert()
  або computeOrderTotals(), інакше отримаєте число в одній валюті зі значком
  іншої».
- Опційно — додати ESLint-правило або dev-only assert, що перевіряє, що
  `formatMoney(x, c)` викликається з `x`, явно нормалізованим до `c`.
  (Реалістичніше — просто code review через типи: змусити `formatMoney`
  приймати тип `Money` з обовʼязковим `currency`, який мусить дорівнювати
  переданій валюті.)

### 5.4. Інтеграція з оплатою клієнта

Коли користувач натискає «+100 / +500 / +1000» у FinanceBlock:
- Кнопки додають у валюті `Order.currency` (бо це валюта чека).
- Якщо клієнт фактично заплатив в іншій валюті — у майбутньому додати
  модалку «Конвертувати X UAH у Y USD за курсом Z» з збереженням `Order.totalPaid`
  у валюті замовлення. **Поки не робити** — занадто складно для першої ітерації.
- `displayCurrency` тут НЕ використовується: якщо я дивлюсь у USD, а замовлення
  в UAH, кнопка «+100» все одно додає 100 UAH (бо це чек у UAH). Це треба
  явно показати в UI: біля інпуту вказувати `Currency.UAH ₴`, не приховувати
  валюту замовлення під `displayCurrency`.

Поточний код `addToPaid` (`FinanceBlock.tsx:66-70`) не вказує валюту і додає
число до `paidNum`, який потім зберігається в `Order.totalPaid` без позначки
валюти. Це **працює правильно за замовчуванням** лише якщо `Order.currency` ≡
UAH і кнопки в UAH. Як тільки буде USD-замовлення — поведінка стане
плутаною. Зафіксувати це інваріантом: **кнопки швидкого додавання завжди
у валюті замовлення, валюта показана біля кнопок**.

---

## 6. Acceptance criteria

Сценарій з реальними даними (як на скріншоті — борг 107 830 ₴ ≡ $2 598 при
курсі 41.5):

| Дія                                          | Очікувано в UAH-режимі | Очікувано в USD-режимі |
|----------------------------------------------|------------------------|-------------------------|
| Дашборд → DebtorsList → загальна сума        | 107 830 ₴             | $2 598                  |
| Дашборд → DebtorsList → Ірина Мельник        | 24 980 ₴              | $602                    |
| Дашборд → StatCard «Боржників» → sub         | 107 830 ₴             | $2 598                  |
| /clients → ClientCard «Борг»                  | 24 980 ₴ (у Ірини)    | $602 (у Ірини)          |
| /clients/[id] → ClientProfile → totalDebt    | 24 980 ₴              | $602                    |
| /finance → FinanceSummaryCards → Борг        | 107 830 ₴             | $2 598                  |
| /orders/[id] → FinanceBlock → До оплати      | (у валюті замовлення) | (конвертовано)          |
| Дашборд → Виторг тижня (RecentClosedOrders)  | сума всіх в UAH       | сума всіх в USD          |

Додаткова перевірка інваріанта:
- Створити одне UAH-замовлення (борг 1000 ₴) і одне USD-замовлення (борг $50).
- При курсі 40 загальний борг має бути:
   - в UAH: 1000 + (50 × 40) = 3000 ₴
   - в USD: (1000 / 40) + 50 = 75 $

---

## 7. Промпт для Claude Code

````
Виправ наскрізну валютну логіку для боргів і агрегатів у проєкті nice.car.if
(auto-crm-project). Це продовження файлу `екстразмін/03-finansova-lohika.md`.
Прочитай ОБИДВА файли перш ніж починати: 03 (computeOrderTotals)
і 04 (наскрізне відображення).

ПЕРЕДУМОВА: файл 03 має бути впроваджений ПЕРШИМ (computeOrderTotals,
toDisplay, інваріанти). Цей блок 04 спирається на ту інфраструктуру.

ЩО ЗРОБИТИ:

1. У `lib/finance.ts` додай ще дві експортні функції:

   export function computeOrderDebt(
     order: OrderWithRelations,
     displayCurrency: Currency,
     fallbackRate: number,
   ): { debtInOrderCurrency: number; debtInDisplayCurrency: number;
        orderCurrency: Currency; isPaid: boolean };

   export function aggregateDebtors(
     orders: OrderWithRelations[],
     displayCurrency: Currency,
     fallbackRate: number,
   ): { debtors: DebtorRow[]; totalDebt: number };

   - debtInOrderCurrency = computeOrderTotals(...).outstanding (у валюті замовлення)
   - debtInDisplayCurrency = convert(debtInOrderCurrency, Order.currency,
     displayCurrency, currentRate)
   - aggregateDebtors мапить orders, фільтрує debt > 0.01, сортує DESC,
     повертає debtors з debtInDisplayCurrency і totalDebt = sum(debtInDisplayCurrency).

2. У `app/(crm)/dashboard/page.tsx`:
   - замінити обчислення `debtors` (рядки 96-110) на виклик
     `aggregateDebtors(nonClosedS, displayCurrency, fallbackRate)`.
   - `totalDebt` — з результату aggregateDebtors.
   - У StatCard «Боржників» (рядок 187): прибрати хардкод `₴`,
     замінити на `formatMoney(totalDebt, displayCurrency)`.
   - `weekRevenue` (рядки 115-126): використати computeOrderTotals для кожного
     закритого замовлення, нормалізувати у displayCurrency.
   - Прокинути displayCurrency у RecentClosedOrders (вже прокидається).

3. У `components/dashboard/DebtorsList.tsx`:
   - НЕ змінювати: вона вже приймає `totalDebt` і `debt` як числа і вже
     приймає `displayCurrency`. Числа тепер прийдуть конвертовані.
   - Перевірити що `formatMoney(d.debt, displayCurrency)` працює коректно
     (тобто debt уже в displayCurrency, formatMoney тільки форматує).

4. У `components/clients/ClientCard.tsx`:
   - Поле `totalDebt` (рядки 39-48): рахувати через `computeOrderDebt`
     по кожному замовленню клієнта, сумувати в displayCurrency.
   - Прийняти `displayCurrency` як prop (передавати зі ClientsList).
   - На рядку 96 видалити хардкод `Currency.UAH`, замінити на
     `formatMoney(totalDebt, displayCurrency)`.

5. У `app/(crm)/clients/page.tsx`:
   - Дочитати `displayCurrency` з Settings, прокинути в `<ClientsList>`.
   - ClientsList прокидає в кожну `<ClientCard>`.

6. У `components/clients/ClientProfile.tsx`:
   - Усі виклики `calcOrderTotal` (рядки 202, 337, 382, 389, 414) замінити
     на `computeOrderTotals(order, displayCurrency, fallbackRate).orderTotal`.
   - `debt` рахувати через `computeOrderDebt`.
   - Усі `formatMoney(..., displayCurrency)` лишити, але передавати вже
     конвертовані суми.

7. У `components/clients/VehicleHistory.tsx`, `components/orders/OrderCard.tsx`,
   `components/dashboard/RecentClosedOrders.tsx`:
   - Те саме: викликати computeOrderTotals замість calcOrderTotal.
   - Прокинути displayCurrency через пропси з батьківських сторінок.

8. У `lib/currency.ts`:
   - Перед визначенням `formatMoney` додати JSDoc:
     /**
      * !! ВАЖЛИВО: ця функція ЛИШЕ форматує число зі значком валюти.
      * Жодної конвертації! Перед викликом передай число вже нормалізоване
      * у вказану валюту через convert() або computeOrderTotals().
      */
   - Розглянути жорстку типізацію: змінити сигнатуру на
     `formatMoney(money: { amount: number; currency: Currency })` —
     щоб компілятор змусив передати currency прямо разом із числом
     (превентивно проти випадкового неспівпадіння). АЛЕ це багатоступеневий
     рефакторинг — поки що тільки JSDoc.

9. У `lib/utils.ts`:
   - calcOrderTotal і calcDebt позначити /** @deprecated use computeOrderTotals */
   - НЕ видаляти, тести в `tests/unit/utils.test.ts` залежать.

10. У `tests/unit/utils.test.ts`:
    - Додати тестові кейси для computeOrderTotals і computeOrderDebt:
      * Замовлення повністю в UAH — debt у UAH і USD коректний.
      * Замовлення повністю в USD — debt у обох валютах коректний.
      * Замовлення з мішаним works (USD робота + UAH робота) — debt коректний.
      * aggregateDebtors на 3 замовленнях з різними Order.currency — totalDebt
        у displayCurrency = sum конвертованих.

ВЕРИФІКАЦІЯ:
- npm run build (без помилок)
- npm test (всі тести зелені, включно з новими)
- На дашборді перемкнути валюту USD↔UAH — суми боргів змінюються пропорційно
  курсу, не лише значок (звіритись з таблицею в розділі 6 файлу 04).
- Зайти у клієнта з боргом — у списку клієнтів і профілі суми однакові
  (раніше було розходження через хардкод Currency.UAH в ClientCard).

ВАЖЛИВО:
- НЕ міняти Order.totalPaid / advancePayment логіку: вони лишаються у
  валюті замовлення. displayCurrency тільки для відображення.
- Кнопки «+100 / +500 / +1000» додають у валюті замовлення — додай
  поряд з ними підпис «Currency.UAH ₴» (або відповідний значок), щоб
  користувач бачив у чому платіж, навіть якщо displayCurrency інший.
````

---

## 8. Що увійде в пояснювальну записку

Цей файл доповнює розділ «Архітектура фінансового модуля» з файлу 03:

- **Тривимірна валютна модель** (запис / замовлення / відображення) —
  розділ 5.1. Канонічний приклад «model vs view» у фінансових системах.
- **Інтеграція з оплатами клієнта** — розділ 4: чому платіж зберігається у
  валюті замовлення, а не у валюті відображення; як це відповідає реальній
  бухгалтерській практиці.
- **Cross-cutting concern: одна функція = одне місце для конверсії** —
  розділ 5.3. Аргументація за централізацію через `computeOrderTotals` +
  `aggregateDebtors`, замість 13 копій логіки в різних компонентах.
- **Типобезпека як механізм запобігання помилок** — розділ 5.3 (пункт про
  жорстку сигнатуру `formatMoney`). Показує, що типи можуть превентивно
  ловити такі баги (передачу «голого числа» в форматер з очікуваною валютою).
- **Регресійні тести** — розділ 7, пункт 10: набір тестових кейсів для
  валютної логіки. Сильний матеріал для розділу «верифікація».
