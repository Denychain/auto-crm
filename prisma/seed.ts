import { PrismaClient, OrderStatus, PartStatus, PhotoType } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// Raw data
// ─────────────────────────────────────────────────────────────────────────────

const CLIENTS = [
  { name: "Олексій Карпенко",   phone: "+380671234501", note: "Завжди просить знижку. Постійний клієнт з 2022." },
  { name: "Михайло Ткаченко",   phone: "+380501234502", note: null },
  { name: "Сергій Бондаренко",  phone: "+380631234503", note: "Любить отримувати фото прогресу в Viber." },
  { name: "Ірина Мельник",      phone: "+380671234504", note: "Платить лише готівкою." },
  { name: "Василь Кравченко",   phone: "+380501234505", note: null },
  { name: "Наталія Шевченко",   phone: "+380631234506", note: "Посилала подругу — Оксана Гриценко." },
  { name: "Дмитро Литвин",      phone: "+380671234507", note: null },
  { name: "Андрій Коваленко",   phone: "+380501234508", note: "СТО «АвтоПлюс» — корпоративний клієнт." },
  { name: "Оксана Гриценко",    phone: "+380631234509", note: "Прийшла по рекомендації Шевченко." },
  { name: "Руслан Марченко",    phone: "+380671234510", note: null },
  { name: "Тетяна Романенко",   phone: "+380501234511", note: "Два авто — Passat і Golf." },
  { name: "Іван Сидоренко",     phone: "+380631234512", note: null },
];

const VEHICLES = [
  // Карпенко
  { clientIdx: 0,  plate: "AA1234BB", make: "Toyota",     model: "Camry",    year: 2019 },
  // Ткаченко
  { clientIdx: 1,  plate: "AB5678CD", make: "BMW",        model: "5 Series", year: 2018 },
  // Бондаренко
  { clientIdx: 2,  plate: "AC9012EF", make: "Volkswagen", model: "Passat",   year: 2020 },
  // Мельник
  { clientIdx: 3,  plate: "AD3456GH", make: "Renault",    model: "Megane",   year: 2017 },
  // Кравченко
  { clientIdx: 4,  plate: "AE7890IJ", make: "Ford",       model: "Focus",    year: 2016 },
  // Шевченко
  { clientIdx: 5,  plate: "AF2345KL", make: "Skoda",      model: "Octavia",  year: 2021 },
  // Литвин — два авто
  { clientIdx: 6,  plate: "AG6789MN", make: "Hyundai",    model: "Tucson",   year: 2022 },
  { clientIdx: 6,  plate: "AH1234OP", make: "Honda",      model: "Civic",    year: 2015 },
  // Коваленко (корпорат)
  { clientIdx: 7,  plate: "AI5678QR", make: "Mercedes",   model: "E-Class",  year: 2020 },
  { clientIdx: 7,  plate: "AJ9012ST", make: "Volkswagen", model: "Touareg",  year: 2019 },
  // Гриценко
  { clientIdx: 8,  plate: "AK3456UV", make: "Kia",        model: "Sportage", year: 2023 },
  // Марченко
  { clientIdx: 9,  plate: "AL7890WX", make: "Toyota",     model: "RAV4",     year: 2021 },
  // Романенко — два авто
  { clientIdx: 10, plate: "AM2345YZ", make: "Volkswagen", model: "Passat",   year: 2018 },
  { clientIdx: 10, plate: "AN6789AA", make: "Volkswagen", model: "Golf",     year: 2020 },
  // Сидоренко
  { clientIdx: 11, plate: "AO1234BB", make: "Mazda",      model: "CX-5",     year: 2022 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  // ── Wipe existing data in dependency order ───────────────────────────────
  await prisma.workerShare.deleteMany();
  await prisma.orderPhoto.deleteMany();
  await prisma.orderPart.deleteMany();
  await prisma.orderWork.deleteMany();
  await prisma.order.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.client.deleteMany();
  await prisma.dreamFund.deleteMany();
  await prisma.shoppingListItem.deleteMany();

  // ── Clients ──────────────────────────────────────────────────────────────
  const clients = await Promise.all(
    CLIENTS.map((c) =>
      prisma.client.create({ data: c })
    )
  );
  console.log(`  ✓ ${clients.length} clients`);

  // ── Vehicles ─────────────────────────────────────────────────────────────
  const vehicles = await Promise.all(
    VEHICLES.map((v) =>
      prisma.vehicle.create({
        data: {
          clientId: clients[v.clientIdx].id,
          plateNumber: v.plate,
          make: v.make,
          model: v.model,
          year: v.year,
        },
      })
    )
  );
  console.log(`  ✓ ${vehicles.length} vehicles`);

  // ── Orders ────────────────────────────────────────────────────────────────
  // Helper: create a full order with works, parts, photos, shares
  async function createOrder(opts: {
    vehicleIdx: number;
    status: OrderStatus;
    description: string;
    estimatedPrice: number;
    advancePayment: number;
    totalPaid: number;
    createdDaysAgo: number;
    readyDaysAgo?: number;
    works: { name: string; price: number }[];
    parts: { name: string; status: PartStatus; estimatedPrice: number; actualPrice?: number }[];
    shares?: { workerName: string; amount: number }[];
    hasActPhotos?: boolean;
    hasProcessPhotos?: boolean;
  }) {
    const vehicle = vehicles[opts.vehicleIdx];
    const client  = clients[VEHICLES[opts.vehicleIdx].clientIdx];

    const order = await prisma.order.create({
      data: {
        clientId:       client.id,
        vehicleId:      vehicle.id,
        status:         opts.status,
        description:    opts.description,
        estimatedPrice: opts.estimatedPrice,
        advancePayment: opts.advancePayment,
        totalPaid:      opts.totalPaid,
        createdAt:      daysAgo(opts.createdDaysAgo),
        readyDate:      opts.readyDaysAgo != null ? daysAgo(opts.readyDaysAgo) : null,
      },
    });

    if (opts.works.length) {
      await prisma.orderWork.createMany({
        data: opts.works.map((w) => ({ orderId: order.id, name: w.name, price: w.price })),
      });
    }

    if (opts.parts.length) {
      await prisma.orderPart.createMany({
        data: opts.parts.map((p) => ({
          orderId:        order.id,
          name:           p.name,
          status:         p.status,
          estimatedPrice: p.estimatedPrice,
          actualPrice:    p.actualPrice ?? null,
        })),
      });
    }

    if (opts.shares?.length) {
      await prisma.workerShare.createMany({
        data: opts.shares.map((s) => ({ orderId: order.id, workerName: s.workerName, amount: s.amount })),
      });
    }

    // Placeholder photos — real URLs will come from Cloudinary
    const photoBase = "https://placehold.co/800x600/e2e8f0/64748b?text=";

    if (opts.hasActPhotos) {
      await prisma.orderPhoto.createMany({
        data: [
          { orderId: order.id, type: PhotoType.ACT_IN, url: `${photoBase}Перед`,      description: "Перед" },
          { orderId: order.id, type: PhotoType.ACT_IN, url: `${photoBase}Зад`,        description: "Зад" },
          { orderId: order.id, type: PhotoType.ACT_IN, url: `${photoBase}Лівий+бік`,  description: "Лівий бік" },
          { orderId: order.id, type: PhotoType.ACT_IN, url: `${photoBase}Правий+бік`, description: "Правий бік" },
        ],
      });
    }

    if (opts.hasProcessPhotos) {
      await prisma.orderPhoto.createMany({
        data: [
          { orderId: order.id, type: PhotoType.PROCESS, url: `${photoBase}Ґрунтування`,   description: "Авто на стадії ґрунтування" },
          { orderId: order.id, type: PhotoType.PROCESS, url: `${photoBase}Фарбування`,     description: "В камері фарбування" },
        ],
      });
    }

    return order;
  }

  // ── 1. Toyota Camry (Карпенко) — CLOSED, 30 days ago ────────────────────
  await createOrder({
    vehicleIdx:      0,
    status:          OrderStatus.CLOSED,
    description:     "Ремонт переднього бампера після незначної аварії. Заміна правого крила.",
    estimatedPrice:  12000,
    advancePayment:  3000,
    totalPaid:       9000,
    createdDaysAgo:  45,
    readyDaysAgo:    32,
    works: [
      { name: "Базова робота (бампер)",  price: 4500 },
      { name: "Заміна правого крила",    price: 2800 },
      { name: "Полірування",             price: 1200 },
    ],
    parts: [
      { name: "Бампер передній (б/у)",   status: PartStatus.IN_STOCK, estimatedPrice: 2500, actualPrice: 2200 },
      { name: "Крило праве (нове)",      status: PartStatus.IN_STOCK, estimatedPrice: 1800, actualPrice: 1900 },
      { name: "Кліпси бампера",          status: PartStatus.IN_STOCK, estimatedPrice:  150, actualPrice:  140 },
    ],
    shares: [
      { workerName: "Ілля",   amount: 6375 },
      { workerName: "Тато",   amount: 6375 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: true,
  });

  // ── 2. BMW 5 (Ткаченко) — CLOSED, 20 days ago ───────────────────────────
  await createOrder({
    vehicleIdx:      1,
    status:          OrderStatus.CLOSED,
    description:     "Фарбування кришки багажника та заднього бампера. Дрібні подряпини на задній правій двері.",
    estimatedPrice:  9500,
    advancePayment:  2000,
    totalPaid:       7500,
    createdDaysAgo:  35,
    readyDaysAgo:    22,
    works: [
      { name: "Фарбування кришки багажника", price: 3500 },
      { name: "Фарбування заднього бампера", price: 2500 },
      { name: "Локальне фарбування двері",   price: 1800 },
      { name: "Полірування",                 price:  700 },
    ],
    parts: [
      { name: "Фарба BMW Alpinweiss 300",    status: PartStatus.IN_STOCK, estimatedPrice: 1200, actualPrice: 1150 },
      { name: "Лак",                         status: PartStatus.IN_STOCK, estimatedPrice:  600, actualPrice:  580 },
      { name: "Шпаклівка",                   status: PartStatus.IN_STOCK, estimatedPrice:  350, actualPrice:  340 },
    ],
    shares: [
      { workerName: "Ілля",   amount: 5000 },
      { workerName: "Тато",   amount: 5000 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: true,
  });

  // ── 3. VW Passat (Бондаренко) — DONE (overdue, 5 days) ──────────────────
  await createOrder({
    vehicleIdx:      2,
    status:          OrderStatus.DONE,
    description:     "Рихтування лівої передньої двері та стійки. Фарбування.",
    estimatedPrice:  7500,
    advancePayment:  1500,
    totalPaid:       0,
    createdDaysAgo:  18,
    readyDaysAgo:    5,
    works: [
      { name: "Рихтування лівої двері",    price: 2000 },
      { name: "Рихтування стійки",         price: 1500 },
      { name: "Фарбування лівої двері",    price: 2800 },
    ],
    parts: [
      { name: "Фарба VW Deep Black",       status: PartStatus.IN_STOCK,  estimatedPrice: 900, actualPrice: 920 },
      { name: "Ґрунтовка",                 status: PartStatus.IN_STOCK,  estimatedPrice: 450, actualPrice: 430 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: true,
  });

  // ── 4. Renault Megane (Мельник) — PAINT ─────────────────────────────────
  await createOrder({
    vehicleIdx:      3,
    status:          OrderStatus.PAINT,
    description:     "Повне перефарбування авто. Клієнт хоче змінити колір з білого на чорний.",
    estimatedPrice:  28000,
    advancePayment:  8000,
    totalPaid:       0,
    createdDaysAgo:  12,
    works: [
      { name: "Зняття усіх деталей",        price: 3000 },
      { name: "Ґрунтування",                price: 4000 },
      { name: "Фарбування кузова (12 дет)", price: 15000 },
      { name: "Полірування та збірка",      price: 3500 },
    ],
    parts: [
      { name: "Фарба Brilliant Black x4л",  status: PartStatus.IN_STOCK,  estimatedPrice: 4800, actualPrice: 4650 },
      { name: "Лак x3л",                    status: PartStatus.IN_STOCK,  estimatedPrice: 1800, actualPrice: 1750 },
      { name: "Ґрунт кислотний",            status: PartStatus.IN_STOCK,  estimatedPrice:  900, actualPrice:  880 },
      { name: "Абразив P400 x20арк",        status: PartStatus.NEED_TO_BUY, estimatedPrice: 200 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: false,
  });

  // ── 5. Ford Focus (Кравченко) — PREP ────────────────────────────────────
  await createOrder({
    vehicleIdx:      4,
    status:          OrderStatus.PREP,
    description:     "Локальний ремонт: вм'ятина на капоті від граду. Полірування всього авто.",
    estimatedPrice:  5500,
    advancePayment:  1000,
    totalPaid:       0,
    createdDaysAgo:  6,
    works: [
      { name: "PDR — видалення вм'ятин (капот)", price: 3000 },
      { name: "Полірування авто",                price: 1800 },
    ],
    parts: [
      { name: "Полірувальна паста Menzerna",     status: PartStatus.IN_STOCK,  estimatedPrice: 450, actualPrice: 420 },
      { name: "Мікрофібра x5шт",                status: PartStatus.IN_STOCK,  estimatedPrice: 200, actualPrice: 190 },
    ],
    hasActPhotos: true,
  });

  // ── 6. Skoda Octavia (Шевченко) — ASSEMBLY ──────────────────────────────
  await createOrder({
    vehicleIdx:      5,
    status:          OrderStatus.ASSEMBLY,
    description:     "Заміна переднього бампера (розбитий), ремонт капота.",
    estimatedPrice:  8200,
    advancePayment:  2000,
    totalPaid:       0,
    createdDaysAgo:  20,
    works: [
      { name: "Заміна переднього бампера", price: 1500 },
      { name: "Рихтування капота",         price: 2000 },
      { name: "Фарбування капота",         price: 2800 },
      { name: "Фарбування бампера",        price: 2200 },
    ],
    parts: [
      { name: "Бампер Octavia A7 (новий)", status: PartStatus.IN_STOCK, estimatedPrice: 3200, actualPrice: 3100 },
      { name: "Кронштейни бампера x2",    status: PartStatus.IN_STOCK, estimatedPrice:  280, actualPrice:  260 },
      { name: "Фарба Skoda Moon White",   status: PartStatus.IN_STOCK, estimatedPrice: 1100, actualPrice: 1080 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: true,
  });

  // ── 7. Hyundai Tucson (Литвин) — STOP_PARTS ─────────────────────────────
  await createOrder({
    vehicleIdx:      6,
    status:          OrderStatus.STOP_PARTS,
    description:     "Пошкоджено праву сторону після бічного удару. Заміна двох дверей.",
    estimatedPrice:  15000,
    advancePayment:  5000,
    totalPaid:       0,
    createdDaysAgo:  25,
    works: [
      { name: "Заміна правої передньої двері", price: 2500 },
      { name: "Заміна правої задньої двері",   price: 2500 },
      { name: "Рихтування порогу",             price: 1800 },
      { name: "Фарбування 3 деталей",          price: 5500 },
    ],
    parts: [
      { name: "Двері права передня (б/у)",  status: PartStatus.ORDERED,     estimatedPrice: 4500 },
      { name: "Двері права задня (б/у)",    status: PartStatus.NEED_TO_BUY, estimatedPrice: 3800 },
      { name: "Уплотнювачі x2",             status: PartStatus.NEED_TO_BUY, estimatedPrice:  600 },
      { name: "Фарба Hyundai Phantom Black",status: PartStatus.IN_STOCK,    estimatedPrice: 1400, actualPrice: 1380 },
    ],
    hasActPhotos: true,
  });

  // ── 8. Honda Civic (Литвин 2-е авто) — DISASSEMBLY ──────────────────────
  await createOrder({
    vehicleIdx:      7,
    status:          OrderStatus.DISASSEMBLY,
    description:     "Розбірка та оцінка пошкоджень після ДТП. Авто ударило ззаду.",
    estimatedPrice:  6000,
    advancePayment:  1500,
    totalPaid:       0,
    createdDaysAgo:  3,
    works: [
      { name: "Рихтування кришки багажника", price: 2500 },
      { name: "Заміна заднього бампера",     price: 1200 },
      { name: "Фарбування 2 деталей",        price: 3200 },
    ],
    parts: [
      { name: "Бампер задній Honda Civic",   status: PartStatus.NEED_TO_BUY, estimatedPrice: 2800 },
      { name: "Фарба Honda Midnight Blue",   status: PartStatus.NEED_TO_BUY, estimatedPrice: 1100 },
    ],
    hasActPhotos: true,
  });

  // ── 9. Mercedes E-Class (Коваленко корп.) — DONE ────────────────────────
  await createOrder({
    vehicleIdx:      8,
    status:          OrderStatus.DONE,
    description:     "Корпоративне авто. Подряпини на всіх 4 дверях + пошкоджений передній бампер.",
    estimatedPrice:  11000,
    advancePayment:  4000,
    totalPaid:       7000,
    createdDaysAgo:  30,
    readyDaysAgo:    2,
    works: [
      { name: "Локальне фарбування 4 дверей", price: 6000 },
      { name: "Ремонт бампера переднього",    price: 2500 },
      { name: "Полірування авто",             price: 1500 },
    ],
    parts: [
      { name: "Фарба Mercedes 197 Obsidian Black", status: PartStatus.IN_STOCK, estimatedPrice: 1800, actualPrice: 1760 },
      { name: "Лак",                               status: PartStatus.IN_STOCK, estimatedPrice:  800, actualPrice:  780 },
    ],
    hasActPhotos:     true,
    hasProcessPhotos: true,
  });

  // ── 10. VW Touareg (Коваленко корп.) — QUEUE ────────────────────────────
  await createOrder({
    vehicleIdx:      9,
    status:          OrderStatus.QUEUE,
    description:     "Плановий кузовний ремонт. Є вм'ятини на лівому крилі та двері.",
    estimatedPrice:  9000,
    advancePayment:  2500,
    totalPaid:       0,
    createdDaysAgo:  1,
    works: [
      { name: "Рихтування лівого крила", price: 2000 },
      { name: "Рихтування лівої двері", price: 2000 },
      { name: "Фарбування 2 деталей",   price: 4500 },
    ],
    parts: [
      { name: "Фарба VW Deep Black",    status: PartStatus.NEED_TO_BUY, estimatedPrice: 1200 },
      { name: "Ґрунтовка",              status: PartStatus.NEED_TO_BUY, estimatedPrice:  500 },
    ],
    hasActPhotos: true,
  });

  // ── 11. Kia Sportage (Гриценко) — QUEUE ─────────────────────────────────
  await createOrder({
    vehicleIdx:      10,
    status:          OrderStatus.QUEUE,
    description:     "Після паркувального удару. Пошкоджено задній лівий кут кузова.",
    estimatedPrice:  4500,
    advancePayment:  1000,
    totalPaid:       0,
    createdDaysAgo:  2,
    works: [
      { name: "Рихтування заднього лівого крила", price: 2000 },
      { name: "Фарбування крила",                 price: 2000 },
    ],
    parts: [
      { name: "Фарба Kia Snow White Pearl", status: PartStatus.NEED_TO_BUY, estimatedPrice: 950 },
    ],
    hasActPhotos: true,
  });

  // ── 12. Toyota RAV4 (Марченко) — POSTPONED ──────────────────────────────
  await createOrder({
    vehicleIdx:      11,
    status:          OrderStatus.POSTPONED,
    description:     "Клієнт поїхав у відрядження. Відкладено до кінця місяця. Великий ремонт після ДТП.",
    estimatedPrice:  22000,
    advancePayment:  0,
    totalPaid:       0,
    createdDaysAgo:  40,
    works: [
      { name: "Повний кузовний ремонт (права сторона)", price: 14000 },
      { name: "Заміна правого переднього крила",        price: 1500 },
      { name: "Фарбування 6 деталей",                   price: 9000 },
    ],
    parts: [
      { name: "Крило переднє праве (нове)", status: PartStatus.NEED_TO_BUY, estimatedPrice: 3200 },
      { name: "Двері передня права (б/у)", status: PartStatus.NEED_TO_BUY, estimatedPrice: 4500 },
      { name: "Фарба Toyota Platinum White",status: PartStatus.NEED_TO_BUY, estimatedPrice: 1500 },
    ],
  });

  // ── 13. VW Passat (Романенко) — STOP_PAINT ──────────────────────────────
  await createOrder({
    vehicleIdx:      12,
    status:          OrderStatus.STOP_PAINT,
    description:     "Не можемо підібрати фарбу — перламутровий відтінок. Чекаємо зразок від постачальника.",
    estimatedPrice:  6800,
    advancePayment:  1500,
    totalPaid:       0,
    createdDaysAgo:  14,
    works: [
      { name: "Рихтування переднього капота", price: 1800 },
      { name: "Фарбування капота",            price: 2800 },
      { name: "Полірування",                  price:  900 },
    ],
    parts: [
      { name: "Фарба VW Reflex Silver (перламутр)", status: PartStatus.ORDERED, estimatedPrice: 1800 },
      { name: "Лак",                                status: PartStatus.IN_STOCK, estimatedPrice:  600, actualPrice: 580 },
    ],
    hasActPhotos: true,
  });

  // ── 14. VW Golf (Романенко 2-е авто) — CLOSED ───────────────────────────
  await createOrder({
    vehicleIdx:      13,
    status:          OrderStatus.CLOSED,
    description:     "Фарбування кришки багажника та заміна стоп-сигналів (розбиті при ДТП).",
    estimatedPrice:  4200,
    advancePayment:  1000,
    totalPaid:       3200,
    createdDaysAgo:  60,
    readyDaysAgo:    50,
    works: [
      { name: "Фарбування кришки багажника", price: 2200 },
      { name: "Рихтування кришки",           price:  800 },
    ],
    parts: [
      { name: "Стоп-сигнали VW Golf VII x2", status: PartStatus.IN_STOCK, estimatedPrice: 1400, actualPrice: 1350 },
      { name: "Фарба VW Deep Black",         status: PartStatus.IN_STOCK, estimatedPrice:  700, actualPrice:  680 },
    ],
    shares: [
      { workerName: "Ілля", amount: 2125 },
      { workerName: "Тато", amount: 2125 },
    ],
    hasActPhotos: true,
  });

  // ── 15. Mazda CX-5 (Сидоренко) — DISASSEMBLY ────────────────────────────
  await createOrder({
    vehicleIdx:      14,
    status:          OrderStatus.DISASSEMBLY,
    description:     "Авто після бокового удару. Права сторона, 3 панелі. Треба оцінити і узгодити ціну.",
    estimatedPrice:  18000,
    advancePayment:  5000,
    totalPaid:       0,
    createdDaysAgo:  4,
    works: [
      { name: "Рихтування правих дверей x2", price: 4000 },
      { name: "Рихтування заднього крила",   price: 2500 },
      { name: "Фарбування 4 деталей",        price: 8500 },
    ],
    parts: [
      { name: "Молдинг правої двері",        status: PartStatus.NEED_TO_BUY, estimatedPrice:  800 },
      { name: "Фарба Mazda Machine Grey",    status: PartStatus.NEED_TO_BUY, estimatedPrice: 1600 },
    ],
    hasActPhotos: true,
  });

  console.log("  ✓ 15 orders with works, parts, photos, shares");

  // ── DreamFund ─────────────────────────────────────────────────────────────
  await prisma.dreamFund.createMany({
    data: [
      { goalName: "Нова покрасочна камера",     targetAmount: 150000, currentAmount: 28500 },
      { goalName: "Підйомник для кузовних робіт", targetAmount: 80000,  currentAmount: 12000 },
    ],
  });
  console.log("  ✓ 2 dream fund goals");

  // ── Shopping list ─────────────────────────────────────────────────────────
  await prisma.shoppingListItem.createMany({
    data: [
      { name: "Розчинник (каністра 5л)",    isNeeded: true },
      { name: "Малярська стрічка 3M x10",   isNeeded: true },
      { name: "Абразив P800 x50 аркушів",   isNeeded: true },
      { name: "Ганчірка знежирювальна x20", isNeeded: false },
      { name: "Лак УР-1371 (каністра 4л)",  isNeeded: true },
      { name: "Шпаклівка Dynatron x3кг",    isNeeded: false },
      { name: "Полірувальна паста фінішна",  isNeeded: true },
    ],
  });
  console.log("  ✓ 7 shopping list items");

  console.log("\n✅ Seed complete!");
  console.log("   12 clients · 15 vehicles · 15 orders · 2 dream goals · 7 shopping items");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
