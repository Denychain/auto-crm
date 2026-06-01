# Екстра-зміна #13 — Картка замовлення «Повністю сплачено» хоча не сплачено

**Дата:** 2026-05-31
**Симптом:** У блоці «Фінанси» картки замовлення показується зелений рядок
«Повністю сплачено ✓» навіть тоді, коли клієнт нічого не платив.

---

## 1. Корінь проблеми

**Файл:** `components/orders/OrderDetail/FinanceBlock.tsx:60-72, 197-209`

Формула боргу:
```ts
const debt = Math.max(0, totals.orderTotal - paidInDisplay - advInDisplay);
```

Дисплей-логіка:
```tsx
{debt > 0.01 ? "До оплати" : "Повністю сплачено"}
```

**Дефект:** для **порожнього замовлення** (без робіт і запчастин)
`totals.orderTotal = worksTotal + partsActualTotal = 0`. Якщо `paid = 0`
і `adv = 0`, то `debt = 0`, що `≤ 0.01`, і UI показує «Повністю сплачено».

Це **логічна помилка**: відсутність боргу ≠ повна оплата. Порожнє
замовлення — це **«не заповнено»**, а не «оплачено».

---

## 2. Усі проблемні сценарії

Я прокатав 6 сценаріїв через формулу:

| Сценарій | works | parts | orderTotal | paid | adv | debt | UI зараз | UI має |
|----------|-------|-------|------------|------|-----|------|----------|--------|
| 1. Нове порожнє замовлення | — | — | 0 | 0 | 0 | 0 | «Повністю сплачено» ❌ | «Не заповнено» |
| 2. Тільки `estimatedPrice` (5000) | — | — | 0 | 0 | 0 | 0 | «Повністю сплачено» ❌ | «Не заповнено» або врахувати estimate |
| 3. Завдаток внесений, робіт ще нема | — | — | 0 | 0 | 500 | 0 | «Повністю сплачено» ❌ | «Передоплата 500 ₴» |
| 4. Замовлення з роботами, нічого не сплачено | 5000 | — | 5000 | 0 | 0 | 5000 | «До оплати 5000» ✓ | «Не оплачено 5000» |
| 5. Часткова оплата | 5000 | — | 5000 | 2000 | 0 | 3000 | «До оплати 3000» ✓ | те саме |
| 6. Повна оплата | 5000 | — | 5000 | 5000 | 0 | 0 | «Повністю сплачено» ✓ | те саме |
| 7. Переплата | 5000 | — | 5000 | 6000 | 0 | 0 | «Повністю сплачено» (приховано «+1000») | «Переплата 1000 ₴» (попередження) |

З 7 сценаріїв **3 показуються неправильно** (1, 2, 3) і ще **2 не
розрізняються коректно** (4 vs 6, 7 vs 6).

---

## 3. Друге місце такого ж бага — Дашборд

**Файл:** `components/dashboard/StatCard` (через `dashboard/page.tsx`)

Якщо логіка боргу однакова — порожні замовлення можуть не зараховуватись
у борги (це OK), але можуть давати неправильні агрегати в інших місцях.

`lib/finance-pure.ts:aggregateActiveDebt` — використовує `outstanding`:
```ts
const outstanding = computeOrderTotals(o, displayCurrency, fallbackRate).outstanding;
if (outstanding > 0.01) { totalDebt += outstanding; debtorsCount++; }
```

Для порожнього замовлення `outstanding = 0`, тож воно НЕ потрапляє в борги.
Це працює правильно — порожнє замовлення не вважається боржником. ✓

Але УВАГА — для **сценарію 4** («є роботи, нічого не сплачено»), `outstanding = 5000` і
замовлення потрапить у борги. Це правильно. ✓

Тобто **корінь проблеми лише у відображенні в FinanceBlock**. Бекенд-логіка
коректна.

---

## 4. Як має працювати — три явні стани + переплата

Замість бінарного «До оплати / Повністю сплачено» — **чотири стани**:

```tsx
type PaymentStatus =
  | { kind: "empty" }                        // orderTotal == 0
  | { kind: "advance-only"; advance: number } // orderTotal == 0, advance > 0
  | { kind: "owed"; debt: number }            // orderTotal > 0, debt > 0
  | { kind: "paid" }                          // orderTotal > 0, debt == 0
  | { kind: "overpaid"; over: number };       // paid+adv > orderTotal
```

Логіка:
```ts
function getPaymentStatus(orderTotal: number, paid: number, advance: number): PaymentStatus {
  const sum = paid + advance;
  // 1. Замовлення ще не заповнене
  if (orderTotal < 0.01) {
    if (sum > 0.01) return { kind: "advance-only", advance: sum };
    return { kind: "empty" };
  }
  // 2. Маємо суму замовлення
  if (sum < 0.01) return { kind: "owed", debt: orderTotal };       // нічого не сплачено
  if (sum > orderTotal + 0.01) return { kind: "overpaid", over: sum - orderTotal };
  if (sum >= orderTotal - 0.01) return { kind: "paid" };
  return { kind: "owed", debt: orderTotal - sum };
}
```

UI:
| Стан | Колір | Текст | Сума |
|------|-------|-------|------|
| `empty` | сірий (neutral) | «Очікує заповнення» | — |
| `advance-only` | жовтий (info) | «Передоплата» | формат суми |
| `owed` | червоний | «До оплати» | формат суми |
| `paid` | зелений | «Повністю сплачено» | ✓ |
| `overpaid` | жовтий (warning) | «Переплата» | формат суми |

---

## 5. Інші коректуючі правки в тому ж блоці

### 5.1. Показувати «Внесено» окремо

Зараз UI показує два інпути (Завдаток, Оплачено) і одну сумарну
плашку. Корисно додати рядок-підсумок:

```
Завдаток    [    500.00 UAH]
Оплачено    [   1500.00 UAH]
─────────────────────────────
Внесено:                2 000 ₴
До оплати:              3 000 ₴
```

Це робить логіку прозорою — користувач бачить, що завдаток і оплачено
сумуються в одне «внесено» перед відніманням від orderTotal.

### 5.2. Заборонити збереження від'ємних значень

В action `updateFinance` зараз немає валідації:
```ts
data: { totalPaid: data.totalPaid, advancePayment: data.advancePayment, ... }
```

Якщо випадково ввести «-100», воно збережеться. Додати валідацію через
`zod` (так само, як у файлі 09 і 12):

```ts
const UpdateFinanceSchema = z.object({
  totalPaid: z.number().min(0, "Не може бути від'ємним"),
  advancePayment: z.number().min(0, "Не може бути від'ємним"),
  estimatedPrice: z.number().min(0).optional(),
  currency: z.nativeEnum(Currency).optional(),
});
```

### 5.3. Попередження про переплату при збереженні

Якщо `paid + adv > orderTotal` — показати тост-попередження «Внесено
більше за загальну суму», але дозволити зберегти (бо буває здача готівкою).

### 5.4. Заморозити exchangeRate на момент платежу

Поки що `updateFinance` оновлює `baseExchangeRate` лише при зміні валюти
замовлення (рядки 165-173). Але **кожен платіж** клієнта — це окрема
подія з власним курсом. Зараз ми ховаємо це за «agregate paid value».

Для дипломної — **не чіпати**. Це окрема велика задача (модель `Payment`
з історією платежів і курсів). У записці згадати як майбутнє покращення.

### 5.5. Зробити `paid + adv` контрольною сумою при закритті замовлення

При зміні статусу на CLOSED — перевіряти, що `paid + adv ≥ orderTotal − 0.01`.
Якщо ні — попереджати «Закриваєте з боргом X». Це робиться у файлі 05
(пункт 2 промпту для закриття) — інтегрувати разом.

---

## 6. Промпт для Claude Code

````
Виправ логіку статусу оплати в картці замовлення CRM проєкту nice.car.if
(auto-crm-project). Деталі — у файлі `екстразмін/13-finance-block-zavzhdy-splacheno.md`.

ПРОБЛЕМА: блок «Фінанси» (`components/orders/OrderDetail/FinanceBlock.tsx`)
показує «Повністю сплачено» для замовлення з orderTotal=0 (порожнє),
бо boolean-логіка `debt > 0.01` не розрізняє «нічого не винні» і «ще не
заповнено».

═══════════════════════════════════════════════════════════════════════
КРОК 1 — Винести логіку статусу платежу в чисту функцію
═══════════════════════════════════════════════════════════════════════

У `lib/finance-pure.ts` додай (після `computeOrderTotals`):

```ts
export type PaymentStatus =
  | { kind: "empty" }
  | { kind: "advance-only"; advance: number }
  | { kind: "owed"; debt: number }
  | { kind: "paid" }
  | { kind: "overpaid"; over: number };

/**
 * Визначає, в якому стані оплати знаходиться замовлення.
 * Усі суми в одній валюті (як правило, displayCurrency).
 *
 * - empty:        замовлення ще не заповнене (немає робіт і запчастин)
 * - advance-only: нічого не вписано, але є завдаток
 * - owed:         є сума замовлення, не сплачено повністю
 * - paid:         сума замовлення повністю покрита (paid + advance)
 * - overpaid:     внесено більше за суму замовлення (потенційна здача)
 */
export function getPaymentStatus(
  orderTotal: number,
  paid: number,
  advance: number
): PaymentStatus {
  const EPSILON = 0.01;
  const sum = (paid || 0) + (advance || 0);

  if (orderTotal < EPSILON) {
    if (sum > EPSILON) return { kind: "advance-only", advance: sum };
    return { kind: "empty" };
  }

  if (sum < EPSILON) return { kind: "owed", debt: orderTotal };
  if (sum > orderTotal + EPSILON) return { kind: "overpaid", over: sum - orderTotal };
  if (sum >= orderTotal - EPSILON) return { kind: "paid" };
  return { kind: "owed", debt: orderTotal - sum };
}
```

═══════════════════════════════════════════════════════════════════════
КРОК 2 — Оновити FinanceBlock щоб використовувати новий status
═══════════════════════════════════════════════════════════════════════

`components/orders/OrderDetail/FinanceBlock.tsx`:

2.1. Додай імпорт:
```ts
import { getPaymentStatus, type PaymentStatus } from "@/lib/finance-pure";
```

2.2. Між обчисленням `debt` (зараз рядок 72) і JSX — додати:
```ts
const paymentStatus = getPaymentStatus(totals.orderTotal, paidInDisplay, advInDisplay);
```

Видалити стару змінну `debt` (вона тепер у paymentStatus як `owed.debt`).

2.3. Додати компонент для рендеру статусу — окрема функція в тому ж файлі
або прямо inline:

```tsx
function PaymentStatusBadge({ status, fmt }: { status: PaymentStatus; fmt: (n: number) => string }) {
  const config = {
    empty: { bg: "bg-muted/30 text-muted-foreground", label: "Очікує заповнення", icon: "—" },
    "advance-only": { bg: "bg-yellow-50 text-yellow-800", label: "Передоплата", icon: null },
    owed: { bg: "bg-red-50 text-red-700", label: "До оплати", icon: null },
    paid: { bg: "bg-green-50 text-green-700", label: "Повністю сплачено", icon: "✓" },
    overpaid: { bg: "bg-amber-50 text-amber-800", label: "Переплата", icon: null },
  }[status.kind];

  const amount =
    status.kind === "advance-only" ? fmt(status.advance) :
    status.kind === "owed" ? fmt(status.debt) :
    status.kind === "overpaid" ? `+${fmt(status.over)}` :
    config.icon ?? "";

  return (
    <div className={cn(
      "flex items-center justify-between rounded-lg px-3 py-2 text-sm py-1 font-bold text-base",
      config.bg
    )}>
      <span>{config.label}</span>
      <span>{amount}</span>
    </div>
  );
}
```

2.4. У JSX — замінити старий блок (рядки 197-209) на:
```tsx
<PaymentStatusBadge status={paymentStatus} fmt={fmt} />
```

2.5. Додати рядок «Внесено» перед статусом (для прозорості):
```tsx
<div className={cn(row, "text-muted-foreground")}>
  <span>Внесено</span>
  <span>{fmt(paidInDisplay + advInDisplay)}</span>
</div>
<Separator className="my-1" />
<PaymentStatusBadge status={paymentStatus} fmt={fmt} />
```

═══════════════════════════════════════════════════════════════════════
КРОК 3 — Валідація updateFinance action
═══════════════════════════════════════════════════════════════════════

`app/(crm)/orders/[id]/actions.ts`, функція `updateFinance` (рядок 158).

3.1. Додати zod-схему на початку файлу (поруч з іншими імпортами):
```ts
import { z } from "zod";

const UpdateFinanceSchema = z.object({
  totalPaid: z.number().min(0, "Сума оплачено не може бути від'ємною"),
  advancePayment: z.number().min(0, "Завдаток не може бути від'ємним"),
  estimatedPrice: z.number().min(0).optional(),
  currency: z.nativeEnum(Currency).optional(),
});
```

3.2. На початку функції — валідація:
```ts
export async function updateFinance(
  orderId: string,
  data: { totalPaid: number; advancePayment: number; estimatedPrice?: number; currency?: Currency }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAuth();

  const parsed = UpdateFinanceSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // ... existing baseExchangeRate logic ...

  await prisma.order.update({
    where: { id: orderId },
    data: { ...parsed.data, ...rateUpdate },
  });
  revalidate(orderId);
  return { ok: true };
}
```

3.3. У FinanceBlock — обробити повернений результат:
```ts
function handleSave() {
  startTransition(async () => {
    const res = await updateFinance(order.id, {
      totalPaid: localPaid,
      advancePayment: localAdv,
      estimatedPrice: estimatedPrice || 0,
      currency: orderCurrency,
    });
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setSaved(true);
    // Попередження про переплату
    if (paymentStatus.kind === "overpaid") {
      toast.warning(`Внесено на ${fmt(paymentStatus.over)} більше за загальну суму`);
    }
  });
}
```

Додати імпорт `toast` з `sonner`, якщо ще немає.

═══════════════════════════════════════════════════════════════════════
КРОК 4 — Unit-тести для getPaymentStatus
═══════════════════════════════════════════════════════════════════════

У `tests/unit/finance.test.ts` (або новому `payment-status.test.ts`):

```ts
import { describe, it, expect } from "vitest";
import { getPaymentStatus } from "@/lib/finance-pure";

describe("getPaymentStatus", () => {
  it("empty order with no payments", () => {
    expect(getPaymentStatus(0, 0, 0)).toEqual({ kind: "empty" });
  });

  it("advance-only on empty order", () => {
    expect(getPaymentStatus(0, 0, 500)).toEqual({ kind: "advance-only", advance: 500 });
  });

  it("paid + advance on empty (sums correctly)", () => {
    expect(getPaymentStatus(0, 200, 300)).toEqual({ kind: "advance-only", advance: 500 });
  });

  it("owed when nothing paid", () => {
    expect(getPaymentStatus(5000, 0, 0)).toEqual({ kind: "owed", debt: 5000 });
  });

  it("partial payment", () => {
    expect(getPaymentStatus(5000, 2000, 500)).toEqual({ kind: "owed", debt: 2500 });
  });

  it("fully paid via advance only", () => {
    expect(getPaymentStatus(5000, 0, 5000)).toEqual({ kind: "paid" });
  });

  it("fully paid via mix", () => {
    expect(getPaymentStatus(5000, 4000, 1000)).toEqual({ kind: "paid" });
  });

  it("overpayment (change due)", () => {
    expect(getPaymentStatus(5000, 6000, 0)).toEqual({ kind: "overpaid", over: 1000 });
  });

  it("epsilon tolerance for paid", () => {
    expect(getPaymentStatus(5000.005, 5000, 0)).toEqual({ kind: "paid" });
  });
});
```

═══════════════════════════════════════════════════════════════════════
ВЕРИФІКАЦІЯ
═══════════════════════════════════════════════════════════════════════

1. npm run build → без помилок.
2. npm test → усі тести зелені.
3. РУЧНА ПЕРЕВІРКА:
   - Створи нове замовлення без робіт і запчастин → бачиш сірий бейдж «Очікує заповнення».
   - Додай завдаток 500 → бачиш жовтий «Передоплата 500 ₴».
   - Додай роботу 5000 → бачиш червоний «До оплати 4500 ₴».
   - Внеси «Оплачено» 4500 → бачиш зелений «Повністю сплачено ✓».
   - Внеси «Оплачено» 5000 (з завдатком 500 уже є) → бачиш жовтий «Переплата 500 ₴».
   - Спробуй ввести від'ємне число → бачиш тост-помилку.

ВАЖЛИВО:
- Перевір, що рядок «Внесено» показує суму завдаток + оплачено.
- Перевір, що при перемиканні валюти відображення стан коректно
  перераховується (бо суми проходять через convert() в paidInDisplay).
- НЕ чіпай computeOrderTotals — він уже коректний. Додаєш ТІЛЬКИ
  getPaymentStatus і використовуєш його у UI.
- НЕ чіпай updateFinance логіку оновлення baseExchangeRate при зміні
  валюти — вона уже коректна (рядки 165-173).
````

---

## 7. Що увійде в пояснювальну записку

З цього файлу для розділу **«Валідація бізнес-логіки»**:

- **Тип-керована логіка станів** — `PaymentStatus` як sum type (Algebraic Data Type)
  гарантує, що неможливо випадково «забути» обробку випадку. Класичний
  приклад «make impossible states impossible».
- **Edge case enumeration** — таблиця в розділі 2 показує, як методично
  перебираються всі можливі стани, замість «спрацює — добре». Сильний
  доказ системного тестування.
- **Bug pattern: бінарна логіка з default-false** — коли `else` гілка
  стає catch-all для невипадково «нульового» стану. Поширена пастка,
  важлива для розділу «методологія тестування».
- **Регресійні тести на чистих функціях** — `getPaymentStatus` приймає
  3 числа, повертає тип. Тестується без mocks, без Prisma, без UI.
  Канонічний приклад тестопровідного дизайну.
