import { PrismaClient, Currency } from "@prisma/client";
import { format } from "date-fns";

const prisma = new PrismaClient();

async function fetchRateFromNBU(date: Date): Promise<number | null> {
  const dateStr = format(date, "yyyyMMdd");
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${dateStr}&json`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ rate: number }>;
    return data[0]?.rate ?? null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("=== Backfill: currency support ===\n");

  // 1. Ensure Settings singleton exists
  const existing = await prisma.settings.findUnique({ where: { id: "singleton" } });
  if (!existing) {
    await prisma.settings.create({
      data: { id: "singleton", defaultCurrency: "USD", displayCurrency: "USD", autoUpdateRate: true },
    });
    console.log("✓ Created default Settings (defaultCurrency=USD, displayCurrency=USD)");
  } else {
    console.log("✓ Settings already exists — skipping");
  }

  // 2. Fetch today's rate from NBU and upsert ExchangeRate
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRate = await prisma.exchangeRate.findUnique({ where: { date: today } });
  let rate: number;

  if (existingRate) {
    rate = existingRate.usdToUah.toNumber();
    console.log(`✓ Rate for today already stored: ${rate} UAH/USD`);
  } else {
    const fetched = await fetchRateFromNBU(today);
    if (fetched) {
      rate = fetched;
      await prisma.exchangeRate.create({
        data: { date: today, usdToUah: rate, source: "NBU" },
      });
      console.log(`✓ Fetched and saved NBU rate: ${rate} UAH/USD`);
    } else {
      rate = 41.0;
      await prisma.exchangeRate.create({
        data: { date: today, usdToUah: rate, source: "MANUAL" },
      });
      console.log(`⚠ NBU fetch failed — using fallback rate: ${rate} UAH/USD`);
    }
  }

  // 3. Backfill Orders
  const orders = await prisma.order.findMany({
    where: { baseExchangeRate: null },
    select: { id: true },
  });
  if (orders.length > 0) {
    await prisma.order.updateMany({
      where: { baseExchangeRate: null },
      data: { currency: Currency.UAH, baseExchangeRate: rate },
    });
    console.log(`✓ Backfilled ${orders.length} Orders → currency=UAH, baseExchangeRate=${rate}`);
  } else {
    console.log("✓ Orders already backfilled — skipping");
  }

  // 4. Backfill OrderWork
  const works = await prisma.orderWork.findMany({
    where: { exchangeRate: null },
    select: { id: true },
  });
  if (works.length > 0) {
    await prisma.orderWork.updateMany({
      where: { exchangeRate: null },
      data: { currency: Currency.UAH, exchangeRate: rate },
    });
    console.log(`✓ Backfilled ${works.length} OrderWork rows`);
  } else {
    console.log("✓ OrderWork already backfilled — skipping");
  }

  // 5. Backfill OrderPart
  const parts = await prisma.orderPart.findMany({
    where: { exchangeRate: null },
    select: { id: true },
  });
  if (parts.length > 0) {
    await prisma.orderPart.updateMany({
      where: { exchangeRate: null },
      data: { currency: Currency.UAH, exchangeRate: rate },
    });
    console.log(`✓ Backfilled ${parts.length} OrderPart rows`);
  } else {
    console.log("✓ OrderPart already backfilled — skipping");
  }

  // 6. Backfill WorkerShare
  const shares = await prisma.workerShare.findMany({
    where: { exchangeRate: null },
    select: { id: true },
  });
  if (shares.length > 0) {
    await prisma.workerShare.updateMany({
      where: { exchangeRate: null },
      data: { currency: Currency.UAH, exchangeRate: rate },
    });
    console.log(`✓ Backfilled ${shares.length} WorkerShare rows`);
  } else {
    console.log("✓ WorkerShare already backfilled — skipping");
  }

  console.log("\n=== Backfill complete ===");
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
