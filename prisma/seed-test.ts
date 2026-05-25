/**
 * Minimal deterministic test dataset (upsert-safe, non-destructive).
 * Run via: npx tsx prisma/seed-test.ts
 * Or automatically via: npm run test:db:reset
 */
import { PrismaClient, OrderStatus, WorkerRole, Currency } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding test database...");

  // ── Settings ──────────────────────────────────────────────────────────────
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      defaultCurrency: Currency.UAH,
      displayCurrency: Currency.UAH,
      autoUpdateRate: true,
    },
  });

  // ── Exchange rate ─────────────────────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.exchangeRate.upsert({
    where: { date: today },
    update: { usdToUah: new Decimal(41.5) },
    create: {
      date: today,
      usdToUah: new Decimal(41.5),
      source: "TEST",
    },
  });

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientIvan = await prisma.client.upsert({
    where: { phone: "+380671111111" },
    update: {},
    create: { name: "Іван Тестовий", phone: "+380671111111" },
  });

  const clientOlha = await prisma.client.upsert({
    where: { phone: "+380672222222" },
    update: {},
    create: { name: "Ольга Тестова", phone: "+380672222222" },
  });

  const clientDmytro = await prisma.client.upsert({
    where: { phone: "+380673333333" },
    update: {},
    create: { name: "Дмитро Тестовий", phone: "+380673333333" },
  });

  // ── Vehicles ──────────────────────────────────────────────────────────────
  const v1 = await prisma.vehicle.upsert({
    where: { plateNumber: "AA1111BB" },
    update: {},
    create: { plateNumber: "AA1111BB", make: "Toyota", model: "Camry", year: 2020, clientId: clientIvan.id },
  });
  const v2 = await prisma.vehicle.upsert({
    where: { plateNumber: "BB2222CC" },
    update: {},
    create: { plateNumber: "BB2222CC", make: "BMW", model: "3 Series", year: 2019, clientId: clientOlha.id },
  });
  const v3 = await prisma.vehicle.upsert({
    where: { plateNumber: "CC3333DD" },
    update: {},
    create: { plateNumber: "CC3333DD", make: "Volkswagen", model: "Golf", year: 2021, clientId: clientDmytro.id },
  });
  const v4 = await prisma.vehicle.upsert({
    where: { plateNumber: "DD4444EE" },
    update: {},
    create: { plateNumber: "DD4444EE", make: "Ford", model: "Focus", year: 2018, clientId: clientIvan.id },
  });
  const v5 = await prisma.vehicle.upsert({
    where: { plateNumber: "EE5555FF" },
    update: {},
    create: { plateNumber: "EE5555FF", make: "Audi", model: "A4", year: 2022, clientId: clientOlha.id },
  });

  // ── Workers ───────────────────────────────────────────────────────────────
  const workerTato = await prisma.worker.upsert({
    where: { id: "worker-tato-test" },
    update: {},
    create: {
      id: "worker-tato-test",
      name: "Тато (тест)",
      roles: [WorkerRole.PAINTER, WorkerRole.OWNER],
      defaultShare: 40,
      isActive: true,
      sortOrder: 90,
    },
  });

  const workerIllia = await prisma.worker.upsert({
    where: { id: "worker-illia-test" },
    update: {},
    create: {
      id: "worker-illia-test",
      name: "Ілля (тест)",
      roles: [WorkerRole.PREP],
      defaultShare: 30,
      isActive: true,
      sortOrder: 91,
    },
  });

  const workerVasia = await prisma.worker.upsert({
    where: { id: "worker-vasia-test" },
    update: {},
    create: {
      id: "worker-vasia-test",
      name: "Вася (тест)",
      roles: [WorkerRole.PREP, WorkerRole.POLISHER],
      defaultShare: 30,
      isActive: true,
      sortOrder: 92,
    },
  });

  // ── ShareTemplates ────────────────────────────────────────────────────────
  // Delete existing rules before upsert (rules have no natural unique key)
  await prisma.shareTemplateRule.deleteMany({ where: { templateId: "tpl-standard-test" } });
  await prisma.shareTemplateRule.deleteMany({ where: { templateId: "tpl-solo-test" } });

  await prisma.shareTemplate.upsert({
    where: { id: "tpl-standard-test" },
    update: {
      rules: {
        create: [
          { role: WorkerRole.PREP, percent: 30 },
          { role: WorkerRole.PAINTER, percent: 30 },
          { role: WorkerRole.OWNER, percent: 40 },
        ],
      },
    },
    create: {
      id: "tpl-standard-test",
      name: "Стандарт (тест)",
      isDefault: false,
      sortOrder: 90,
      rules: {
        create: [
          { role: WorkerRole.PREP, percent: 30 },
          { role: WorkerRole.PAINTER, percent: 30 },
          { role: WorkerRole.OWNER, percent: 40 },
        ],
      },
    },
  });

  await prisma.shareTemplate.upsert({
    where: { id: "tpl-solo-test" },
    update: {
      rules: { create: [{ role: WorkerRole.PAINTER, percent: 100 }] },
    },
    create: {
      id: "tpl-solo-test",
      name: "Соло (тест)",
      isDefault: false,
      sortOrder: 91,
      rules: { create: [{ role: WorkerRole.PAINTER, percent: 100 }] },
    },
  });

  // ── Orders ────────────────────────────────────────────────────────────────
  // Use findFirst + create to avoid duplicating test orders on repeated runs
  const existingOrders = await prisma.order.findMany({
    where: { description: { contains: "[TEST]" } },
  });
  if (existingOrders.length === 0) {
    // Order 1: QUEUE
    await prisma.order.create({
      data: {
        clientId: clientDmytro.id,
        vehicleId: v5.id,
        status: OrderStatus.QUEUE,
        description: "[TEST] Заміна крила",
        estimatedPrice: new Decimal(12000),
        advancePayment: new Decimal(3000),
        totalPaid: new Decimal(0),
        currency: Currency.UAH,
      },
    });

    // Order 2: PREP
    await prisma.order.create({
      data: {
        clientId: clientIvan.id,
        vehicleId: v1.id,
        status: OrderStatus.PREP,
        description: "[TEST] Підготовка переднього бамперу",
        estimatedPrice: new Decimal(5000),
        advancePayment: new Decimal(1000),
        totalPaid: new Decimal(0),
        currency: Currency.UAH,
        works: {
          create: [{ name: "Підготовка бамперу", price: new Decimal(5000), currency: Currency.UAH }],
        },
      },
    });

    // Order 3: PAINT (with worker shares)
    await prisma.order.create({
      data: {
        clientId: clientOlha.id,
        vehicleId: v2.id,
        status: OrderStatus.PAINT,
        description: "[TEST] Фарбування даху",
        estimatedPrice: new Decimal(8000),
        advancePayment: new Decimal(0),
        totalPaid: new Decimal(4000),
        currency: Currency.UAH,
        works: {
          create: [{ name: "Фарбування даху", price: new Decimal(8000), currency: Currency.UAH }],
        },
        workerShares: {
          create: [
            {
              workerName: "Тато (тест)",
              workerId: workerTato.id,
              roleSnapshot: WorkerRole.PAINTER,
              sharePercent: new Decimal(70),
              amount: new Decimal(5600),
              currency: Currency.UAH,
            },
            {
              workerName: "Ілля (тест)",
              workerId: workerIllia.id,
              roleSnapshot: WorkerRole.PREP,
              sharePercent: new Decimal(30),
              amount: new Decimal(2400),
              currency: Currency.UAH,
            },
          ],
        },
      },
    });

    // Order 4: DONE
    const readyDate = new Date();
    readyDate.setDate(readyDate.getDate() - 2);
    await prisma.order.create({
      data: {
        clientId: clientDmytro.id,
        vehicleId: v3.id,
        status: OrderStatus.DONE,
        description: "[TEST] Повне фарбування кузова",
        estimatedPrice: new Decimal(25000),
        advancePayment: new Decimal(5000),
        totalPaid: new Decimal(25000),
        currency: Currency.UAH,
        readyDate,
        works: {
          create: [{ name: "Кузов + фарбування", price: new Decimal(25000), currency: Currency.UAH }],
        },
      },
    });

    // Order 5: CLOSED (with shares)
    const closedDate = new Date();
    closedDate.setDate(closedDate.getDate() - 7);
    await prisma.order.create({
      data: {
        clientId: clientIvan.id,
        vehicleId: v4.id,
        status: OrderStatus.CLOSED,
        description: "[TEST] Полірування після фарбування",
        estimatedPrice: new Decimal(3000),
        advancePayment: new Decimal(0),
        totalPaid: new Decimal(3000),
        currency: Currency.UAH,
        readyDate: closedDate,
        works: {
          create: [{ name: "Полірування", price: new Decimal(3000), currency: Currency.UAH }],
        },
        workerShares: {
          create: [
            {
              workerName: "Вася (тест)",
              workerId: workerVasia.id,
              roleSnapshot: WorkerRole.POLISHER,
              sharePercent: new Decimal(50),
              amount: new Decimal(1500),
              currency: Currency.UAH,
            },
            {
              workerName: "Тато (тест)",
              workerId: workerTato.id,
              roleSnapshot: WorkerRole.OWNER,
              sharePercent: new Decimal(50),
              amount: new Decimal(1500),
              currency: Currency.UAH,
            },
          ],
        },
      },
    });

    console.log("   ✓ Created 5 test orders");
  } else {
    console.log(`   ℹ Skipped orders — ${existingOrders.length} [TEST] orders already exist`);
  }

  // ── DreamFund ─────────────────────────────────────────────────────────────
  await prisma.dreamFund.upsert({
    where: { id: "fund-test-camera" },
    update: {},
    create: {
      id: "fund-test-camera",
      goalName: "Нова камера (тест)",
      targetAmount: new Decimal(15000),
      currentAmount: new Decimal(2500),
      currency: Currency.USD,
    },
  });

  console.log("✅ Test seed complete:");
  console.log("   - 3 clients, 5 vehicles, 3 workers, 2 templates");
  console.log("   - 5 orders (QUEUE/PREP/PAINT/DONE/CLOSED) — skipped if already exist");
  console.log("   - 1 DreamFund");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
