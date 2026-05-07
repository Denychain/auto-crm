import { prisma } from "./prisma";
import { format } from "date-fns";
import { Decimal } from "@prisma/client/runtime/library";

async function fetchRateFromNBU(date: Date): Promise<{ rate: number; date: Date } | null> {
  const dateStr = format(date, "yyyyMMdd");
  const url = `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${dateStr}&json`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ rate: number; exchangedate: string }>;
    if (!data[0]) return null;
    return { rate: data[0].rate, date };
  } catch {
    return null;
  }
}

export async function getCachedRate(date?: Date): Promise<Decimal> {
  const d = date ?? new Date();
  d.setHours(0, 0, 0, 0);

  const cached = await prisma.exchangeRate.findUnique({ where: { date: d } });
  if (cached) return cached.usdToUah;

  const fetched = await fetchRateFromNBU(d);
  if (fetched) {
    const record = await prisma.exchangeRate.upsert({
      where: { date: d },
      update: {},
      create: { date: d, usdToUah: fetched.rate, source: "NBU" },
    });
    return record.usdToUah;
  }

  // fallback: use latest stored rate
  const latest = await prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });
  if (latest) return latest.usdToUah;

  return new Decimal(41.0);
}

export async function getCurrentRate(): Promise<Decimal> {
  return getCachedRate(new Date());
}

export async function setManualRate(rate: number, date: Date): Promise<void> {
  date.setHours(0, 0, 0, 0);
  await prisma.exchangeRate.upsert({
    where: { date },
    update: { usdToUah: rate, source: "MANUAL" },
    create: { date, usdToUah: rate, source: "MANUAL" },
  });
}

export { fetchRateFromNBU };
