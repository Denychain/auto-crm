# Екстра-зміна #12 — Редагування клієнта + завантаження фото процесу

**Дата:** 2026-05-31
**Дві задачі:**
1. У картці клієнта (`/clients/[id]`) **редагується лише нотатка**. Імʼя
   і телефон — тільки для перегляду.
2. У картці замовлення (`/orders/[id]`), блок «Фото процесу», кнопка
   «Завантажити фото» — **disabled** з підписом «(незабаром)».
   Але `lib/cloudinary.ts` уже працює (форма /contacts і створення нового
   замовлення вже завантажують фото). Залишок — просто додати кнопку для
   процес-фото в наявному замовленні.

---

## 1. Що зараз у коді

### Клієнт: лише нотатка редагується

**`components/clients/ClientProfile.tsx:227-231`:**
```tsx
<h2 className="text-xl font-bold leading-tight">{name}</h2>
<a href={`tel:${phone}`} className="text-sm text-muted-foreground ...">
  {phone}
</a>
```
Імʼя — статичний `<h2>`, телефон — статичне посилання `tel:`. Не редагуються.

Існує лише `NoteEditor` для поля `note`. Server action `updateClientNote`
(`app/(crm)/clients/[id]/actions.ts:12-22`) — оновлює тільки `note`.

### Фото процесу: кнопка disabled

**`components/orders/OrderDetail/ProcessPhotos.tsx:234-243`:**
```tsx
<Button
  variant="outline"
  className="w-full gap-2 text-muted-foreground"
  disabled
  title="Буде доступно після налаштування Cloudinary"
>
  <ImagePlus className="size-4" />
  Завантажити фото
  <span className="ml-1 text-xs">(незабаром)</span>
</Button>
```

Кнопка явно вимкнена з посиланням «після налаштування Cloudinary». Але:
- `lib/cloudinary.ts:uploadImage(file)` уже існує і працює.
- Створення нового замовлення через `app/(crm)/orders/new` уже використовує
  цей шлях (передає `photoUrls[]` у `createOrderWithPhotos`).
- `.env.example` має змінні `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` і
  `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` — якщо вони у `.env` заповнені,
  все працює.

Бракує лише server action `addProcessPhotos` і файлового інпуту в UI.

---

## 2. Промпт для Claude Code

````
Виправ дві речі в CRM-частині проєкту nice.car.if (auto-crm-project).
Деталі — у файлі `екстразмін/12-edit-client-and-photo-upload.md`.

═══════════════════════════════════════════════════════════════════════
ЗАДАЧА 1 — Редагування імені і телефону клієнта
═══════════════════════════════════════════════════════════════════════

ФАЙЛИ:
- `app/(crm)/clients/[id]/actions.ts` — додати server action
- `components/clients/ClientProfile.tsx` — додати UI для редагування

1.1. У `app/(crm)/clients/[id]/actions.ts` додай нову server action:

```ts
import { z } from "zod";

const EditClientSchema = z.object({
  name: z.string().min(2, "Імʼя — мінімум 2 символи").max(120),
  phone: z.string().regex(/^\+?\d{10,13}$/, "Невірний формат телефону"),
});

export async function editClient(
  clientId: string,
  data: { name: string; phone: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAuth();

  const parsed = EditClientSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  // нормалізація телефону: 099 → +380...
  const phone = normalizePhone(parsed.data.phone);

  // перевірка унікальності — якщо телефон уже у іншого клієнта
  const existing = await prisma.client.findUnique({ where: { phone } });
  if (existing && existing.id !== clientId) {
    return { ok: false, error: "Клієнт з таким телефоном уже існує" };
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { name: parsed.data.name.trim(), phone },
    });
    revalidate(clientId);
    return { ok: true };
  } catch (err) {
    console.error("[editClient]", err);
    return { ok: false, error: "Не вдалося зберегти зміни. Спробуйте ще раз." };
  }
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("380")) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+38" + digits;
  return "+" + digits;
}
```

Якщо zod ще не встановлений — `npm install zod`.
Якщо `normalizePhone` вже існує деінде (наприклад у файлі
`app/(site)/contacts/actions.ts` з файла 09) — винеси її у `lib/phone.ts`
і імпортуй у обох місцях.

1.2. У `components/clients/ClientProfile.tsx`:

a) Додай імпорт `editClient` поряд з іншими actions:
```tsx
import {
  updateClientNote,
  removeVehicle,
  addVehicle,
  deleteClient,
  editClient,
} from "@/app/(crm)/clients/[id]/actions";
```

b) Створи новий компонент `<ClientHeaderEditor />` поряд з `NoteEditor`
(приблизно рядок 63, до return основного компоненту):

```tsx
function ClientHeaderEditor({
  clientId,
  initialName,
  initialPhone,
}: {
  clientId: string;
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const res = await editClient(clientId, { name, phone });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("Збережено");
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setName(initialName);
    setPhone(initialPhone);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold leading-tight">{initialName}</h2>
          <a
            href={`tel:${initialPhone}`}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            {initialPhone}
          </a>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Редагувати клієнта"
          title="Редагувати"
        >
          <Pencil className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Імʼя"
        disabled={isPending}
        autoFocus
      />
      <Input
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="+380XXXXXXXXX"
        type="tel"
        disabled={isPending}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={isPending} className="flex-1">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : "Зберегти"}
        </Button>
        <Button size="sm" variant="outline" onClick={cancel} disabled={isPending}>
          Скасувати
        </Button>
      </div>
    </div>
  );
}
```

c) У головній частині `ClientProfile` замінити блок рядків 224-241
(статичні name + phone + delete-кнопка) на:

```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-start justify-between gap-2">
    <ClientHeaderEditor
      clientId={id}
      initialName={name}
      initialPhone={phone}
    />
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="rounded-full p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
      aria-label="Видалити клієнта"
    >
      <Trash2 className="size-4" />
    </button>
  </div>
  ...
</div>
```

УВАГА: треба переробити структуру так, щоб ClientHeaderEditor НЕ містив
edit-кнопку всередині (бо вона блокує delete-кнопку справа). Простіше —
винести delete-кнопку як sibling, а edit-кнопку лишити всередині
ClientHeaderEditor у display-mode. Перевір розкладку візуально.

d) Імпорти, які треба додати у ClientProfile.tsx (якщо ще немає):
- `import { Pencil } from "lucide-react";`
- `import { Input } from "@/components/ui/input";`
- `import { Loader2 } from "lucide-react";`
(інші — Button, useRouter, useTransition, toast — вже є)

═══════════════════════════════════════════════════════════════════════
ЗАДАЧА 2 — Завантаження фото процесу (PROCESS type)
═══════════════════════════════════════════════════════════════════════

ФАЙЛИ:
- `app/(crm)/orders/[id]/actions.ts` — додати server action
- `components/orders/OrderDetail/ProcessPhotos.tsx` — замінити кнопку-плейсхолдер
  на реальний uploader

2.1. У `app/(crm)/orders/[id]/actions.ts` додай (поряд із `deletePhoto`):

```ts
export async function addProcessPhotos(
  orderId: string,
  photoUrls: string[],
  description?: string
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireAuth();

  if (photoUrls.length === 0) {
    return { ok: false, error: "Не передано жодного фото" };
  }

  try {
    await prisma.orderPhoto.createMany({
      data: photoUrls.map((url) => ({
        orderId,
        url,
        type: PhotoType.PROCESS,
        description: description?.trim() || null,
      })),
    });
    revalidate(orderId);
    return { ok: true, count: photoUrls.length };
  } catch (err) {
    console.error("[addProcessPhotos]", err);
    return { ok: false, error: "Не вдалося зберегти фото. Спробуйте ще раз." };
  }
}
```

2.2. У `components/orders/OrderDetail/ProcessPhotos.tsx`:

a) Імпортувати нову action:
```tsx
import { deletePhoto, addProcessPhotos } from "@/app/(crm)/orders/[id]/actions";
import { uploadImage } from "@/lib/cloudinary";
```

b) Замість поточного `<Button disabled ...>` (рядки 234-243) — реалізувати
повноцінний uploader. У `ProcessPhotos` додати стани:

```tsx
const [uploading, setUploading] = useState(false);
const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
const fileInputRef = useRef<HTMLInputElement>(null);

async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
  const files = Array.from(e.target.files ?? []);
  if (files.length === 0) return;

  // обмеження: максимум 10 фото за раз, кожне ≤ 10 MB
  const MAX_FILES = 10;
  const MAX_SIZE = 10 * 1024 * 1024;
  if (files.length > MAX_FILES) {
    toast.error(`Максимум ${MAX_FILES} фото за раз`);
    return;
  }
  for (const f of files) {
    if (f.size > MAX_SIZE) {
      toast.error(`Файл ${f.name} більший за 10 MB`);
      return;
    }
  }

  setUploading(true);
  setUploadProgress({ done: 0, total: files.length });

  try {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      urls.push(url);
      setUploadProgress((p) => p ? { ...p, done: p.done + 1 } : null);
    }

    const result = await addProcessPhotos(orderId, urls);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success(`Додано ${result.count} фото`);
    router.refresh();
  } catch (err) {
    console.error("[uploadPhotos]", err);
    toast.error(err instanceof Error ? err.message : "Помилка завантаження");
  } finally {
    setUploading(false);
    setUploadProgress(null);
    // скинути input, щоб можна було знову обрати ті ж файли
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
}
```

(імпортувати `toast` з `sonner`, `useRef` з `react`).

c) Замість disabled-кнопки — справжній файловий інпут:

```tsx
{/* Hidden file input */}
<input
  ref={fileInputRef}
  type="file"
  accept="image/*"
  multiple
  onChange={handleFileSelect}
  className="hidden"
  disabled={uploading}
/>

<Button
  variant="outline"
  className="w-full gap-2"
  onClick={() => fileInputRef.current?.click()}
  disabled={uploading || isPending}
>
  {uploading ? (
    <>
      <Loader2 className="size-4 animate-spin" />
      Завантаження {uploadProgress ? `${uploadProgress.done}/${uploadProgress.total}` : "..."}
    </>
  ) : (
    <>
      <ImagePlus className="size-4" />
      Завантажити фото
    </>
  )}
</Button>
```

d) ВАЖЛИВО: тип фото — `PhotoType.PROCESS`. Уже корекно, бо
`addProcessPhotos` примусово ставить `type: PhotoType.PROCESS`. Це
відрізняє «фото процесу» (вони показуються в окремій секції) від ACT_IN
(акт прийомки, які вже завантажуються при створенні замовлення).

═══════════════════════════════════════════════════════════════════════
ВЕРИФІКАЦІЯ
═══════════════════════════════════════════════════════════════════════

1. npm run build → без помилок.

2. РЕДАГУВАННЯ КЛІЄНТА:
   - Відкрити /clients/[id].
   - Натиснути іконку олівця біля імʼя — зʼявляються інпути імені і телефону.
   - Змінити імʼя на «Тест Новий», натиснути Зберегти.
   - Перевірити: тост «Збережено», поле оновилось, у БД (prisma studio) теж.
   - Спробувати зберегти невалідний телефон («abc») — побачити тост-помилку.
   - Спробувати зберегти телефон, що вже існує в іншого клієнта — побачити
     «Клієнт з таким телефоном уже існує».
   - Натиснути Скасувати під час редагування — поля відкочуються.

3. ФОТО ПРОЦЕСУ:
   - Відкрити /orders/[id].
   - У блоці «Фото процесу» натиснути «Завантажити фото».
   - Обрати 1-3 фото з компʼютера.
   - Спостерігати «Завантаження 1/3», «2/3», «3/3».
   - Після завершення — фото з'являються у grid, тост «Додано 3 фото».
   - Перевірити в БД: записи у OrderPhoto з type=PROCESS і orderId =
     поточному.
   - Cloudinary URL у `url` полі — відкривається у браузері.
   - Перевірити що фото можна видалити кнопкою «корзина» (уже працює
     через deletePhoto).
   - Перевірити, що файли більші за 10 MB відхиляються з тостом.
   - Перевірити, що >10 файлів за раз відхиляються з тостом.

ВАЖЛИВО:
- НЕ чіпай логіку ACT_IN photos (acт прийомки) — вони завантажуються при
  створенні замовлення, окремий потік.
- НЕ міняй deletePhoto — він уже працює.
- Cloudinary має бути налаштований (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME і
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET у .env.local). Якщо не налаштований —
  uploadImage кине помилку і тост покаже її користувачу.
- Для редагування телефону — нормалізація обовʼязкова, щоб не дублювались
  записи з «099...» і «+38099...» (Prisma бачитиме як різні значення).
````

---

## 3. Що увійде в пояснювальну записку

З цього файлу можна взяти:

- **Аудит «псевдо-готового» функціоналу** — як кнопки з підписами
  «незабаром» обманюють перевіряючого. Приклад того, чому під час
  QA важливо натискати кожну кнопку, а не покладатися на наявність
  елементів інтерфейсу.
- **Reuse-патерн** — `uploadImage()` з `lib/cloudinary.ts` уже працював
  для одного потоку (створення замовлення), і його **переюзано** для
  іншого (додавання фото процесу). Класичний приклад «не дублюй код».
- **Валідація на двох рівнях** — клієнт-side (розмір файлу, кількість)
  + сервер-side (zod schema для телефону/імені). Чому потрібні обидва.
- **Унікальність як бізнес-правило в server action** — приклад того,
  як юніквочність телефону клієнта перевіряється в action, а не лише
  в БД-constraint. Користувач бачить нормальну помилку, а не stack-trace.
