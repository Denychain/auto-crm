# Екстра-зміна #10 — Діагностика: галерея і сканер «до/після» не показують фото

**Дата:** 2026-05-31
**Симптом:** На сторінці `/gallery` не відображаються фото — ані в bento-сітці,
ані в сканері «до/після», ані в timeline. Тільки темні квадрати з лейблами.

---

## 1. Висновок діагностики

**Файли на місці. Код коректний. Проблема — у стейл-будлі і кеші браузера.**

Я перевірив усі ланки:

| Що перевірив                                  | Результат                                             |
|-----------------------------------------------|-------------------------------------------------------|
| Чи існують файли на диску                     | ✅ Усі 30 файлів у `public/assets/gallery/` присутні  |
| Чи коректний синтаксис імпортів               | ✅ Шляхи `/assets/gallery/grid/audi-rs6.png` валідні |
| Чи відповідають імена в коді іменам файлів    | ✅ Точне співпадіння для всіх 28+ референсів          |
| Чи валідні файли (PNG/JPEG)                   | ✅ Перевірив через `file` — справжні PNG/JPEG, не битий бінарник |
| Чи коректний CSS для `<img>` у сканері і списку | ✅ `position:absolute; width:100%; height:100%; object-fit:cover; display:block` |
| Чи `<img>` справді рендериться у JSX           | ✅ Тегі є, conditional `row.img ? <img> : <span>` працює |
| Чи закомічено в git                            | ✅ `git ls-files` бачить усі файли                    |

Отже, з кодом усе ОК.

**Що НЕ ОК:**

```
.next/BUILD_ID            → mtime 2026-05-26 20:12
gallery-client.tsx        → mtime 2026-05-29 19:18  (3 дні пізніше)
public/assets/.../audi-rs6.png → mtime 2026-05-29 16:37  (3 дні пізніше)
```

**Останній `npm run build` був до того, як ти додав код з `<img>`-тегами і
поклав файли в `public/assets/gallery/`.** Якщо ти запускаєш `npm run start`
(production) — він віддає стару зібрану версію, яка ще не знала про фото.
HTML цієї версії містить старі `<span className="ph">текст</span>` замість
`<img>`, тож фото фізично не зʼявляються.

---

## 2. Швидкий фікс — 3 кроки (1 хвилина)

```bash
# 1. Перебудувати з актуальним кодом і ассетами
npm run build

# 2. Запустити заново
npm run start
```

Якщо все одно бачиш темні квадрати — крок 3:

```
3. У браузері (DevTools → Application):
   • Service Workers → Unregister
   • Storage → Clear site data
   • Hard reload (Ctrl+Shift+R / Cmd+Shift+R)
```

PWA-конфіг у `next.config.ts` агресивно кешує сторінки:

```ts
const withPWA = withPWAInit({
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  workboxOptions: { skipWaiting: true },
});
```

Service worker з попереднього візиту віддає стару HTML без фото, навіть
після rebuild. Unregister + clear data розриває це.

**Для розробки** використовуй `npm run dev` — PWA там вимкнено
(`disable: process.env.NODE_ENV === "development"`), service worker не
запускається, кешу немає, всі зміни видно одразу.

---

## 3. Окремий баг сканера — лейбли інвертовані

Це **окрема** проблема, яку я знайшов попутно. Сканер РЕНДЕРИТЬСЯ
правильно (фото видно після ребілда), але **«Before» і «After» лейбли
підписують неправильні половини**.

### Як зараз

**Файл:** `app/(site)/gallery/gallery-client.tsx:322-332`
```tsx
<div className="layer before">
  <img src="/assets/gallery/featured/bmw-m3-before.jpg" />
</div>
<div className="layer after" ref={afterLayerRef}>
  <img src="/assets/gallery/featured/bmw-m3-after.png" />
</div>

<span className="label before">Before · Copart NJ</span>     {/* CSS: left:14px */}
<span className="label after">After · NICE.car.if</span>     {/* CSS: right:14px */}
```

**Логіка clipping (рядок 149):**
```ts
afterLayerRef.current.style.clipPath = `inset(0 ${100 - p}% 0 0)`;
```

Це обрізає `after` шар з ПРАВОЇ сторони. Тобто at `p=50%` — лишається
**ліва половина** після-шару видимою. Bперед-шар (під ним) видно справа.

### Що бачить користувач

| Половина     | Фото                | Лейбл згори         |
|--------------|---------------------|---------------------|
| ЛІВА         | After image (BMW відремонтований) | "Before · Copart NJ" |
| ПРАВА        | Before image (BMW побитий)         | "After · NICE.car.if" |

Полірований BMW підписаний «Before», розбитий — «After». Інверсія.

### Як виправити

Найпростіше — **поміняти місцями DOM-порядок шарів**:

```tsx
{/* AFTER першим, BEFORE другим (зверху) */}
<div className="layer after">
  <img src="/assets/gallery/featured/bmw-m3-after.png" />
</div>
<div className="layer before" ref={afterLayerRef}>  {/* ref лишається на тому, що clip-path-иться */}
  <img src="/assets/gallery/featured/bmw-m3-before.jpg" />
</div>
```

І перейменувати `afterLayerRef` → `topLayerRef` для ясності (необов'язково,
але охайно).

CSS-селектор `.scanner .layer.after { clip-path: inset(0 50% 0 0); }` (рядок
3906) — змінити на `.scanner .layer.before { clip-path: inset(0 50% 0 0); }`.

**Результат:**
- BEFORE-шар зверху, клипаниться → ліва половина зайнята BEFORE (відповідає
  лейблу «Before · Copart NJ» зліва)
- AFTER-шар знизу, видно праворуч → відповідає «After · NICE.car.if» справа

Інтуїтивно: «зліва — як було, справа — як стало». Стандартний UX
before/after sliders.

---

## 4. Окремо — деякі фото низької якості

У ході перевірки знайшов кілька файлів, які варто перезняти. Вони
не «не показуються», але виглядають кепсько:

| Файл                       | Розмір       | Проблема                                          |
|----------------------------|--------------|---------------------------------------------------|
| `grid/skoda-octavia.jpg`   | 273×185, 12KB | Тумбнейл, пікселізується на великій картці       |
| `grid/spray-booth.jpg`     | 612×344, 24KB | EXIF-опис «Auto painter spraying red paint…» — стокове фото |
| `grid/ford-f150-usa.jpg`   | 640×480, 49KB | Низьке розрішення для sz-1 картки                 |
| `grid/container-port.jpg`  | 700×466, 93KB | На межі (для sz-1 ОК, для більших — слабко)       |

Перші три — точно перезняти. Решта (1024×559, 1200×800, 1600×1066,
4912×3264 — `subaru-welding.jpg` навіть надмірно великий) — нормальні.

`subaru-welding.jpg` (4912×3264, 1.4MB) — можна стиснути до ~1600×1066
без втрати якості; зекономиться ~1MB трафіку.

---

## 5. Якщо після всіх кроків фото все одно не видно — діагностика в DevTools

1. F12 → вкладка **Network** → фільтр **Img**.
2. Перезавантажити сторінку (Ctrl+R).
3. Подивитися статус-коди:
   - **200 OK** → фото завантажилось, але не рендериться → проблема CSS/JS
   - **404** → шлях невірний; перевірити, що файл існує саме за цим URL
   - **(failed)** → проблема network / service worker
   - **(from disk cache / from memory cache)** → кешований — пробувати hard reload

4. Якщо 200 OK, але не видно → клікнути на елемент → вкладка **Elements** →
   подивитися `computed` styles → знайти `display: none` / `visibility: hidden` /
   `opacity: 0` / `clip-path` що ховає.

5. Console — глянути чи нема помилок `Failed to load resource` чи CSP
   blocking.

---

## 6. Що увійде в пояснювальну записку

З цього файлу для розділу **«Тестування і налагодження»**:

- **Stale-build як часта помилка production-розгортання** (розділ 1-2) —
  чому Next.js `npm run start` віддає стару версію поки не зробив
  `npm run build`, і чому це особливо болить з PWA-кешем.
- **PWA service worker як точка плутанини** (розділ 2) — кейс, коли
  кешування «допомагає» так, що ламає UX розробки.
- **DOM-порядок vs clip-path** (розділ 3) — приклад «технічно правильно,
  але семантично невірно». Сильна ілюстрація того, що **UX-логіка
  повинна збігатись з технічною реалізацією**, а не «вірно-якось».
- **Діагностичний чек-лист для frontend-проблем** (розділ 5) — шаблон
  пошуку причин, придатний для розділу «Методологія тестування».
