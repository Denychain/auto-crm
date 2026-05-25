"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentRate } from "@/lib/exchange-rate";
import { Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export async function updateSettings(data: {
  displayCurrency?: Currency;
  defaultCurrency?: Currency;
  autoUpdateRate?: boolean;
}): Promise<void> {
  await requireAuth();
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: {
      id: "singleton",
      displayCurrency: data.displayCurrency ?? Currency.UAH,
      defaultCurrency: data.defaultCurrency ?? Currency.UAH,
      autoUpdateRate: data.autoUpdateRate ?? true,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

export async function refreshRateFromNBU(): Promise<{ rate: number }> {
  await requireAuth();
  const rate = await getCurrentRate();
  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { rate: rate.toNumber() };
}

export async function setManualRate(rate: number): Promise<void> {
  await requireAuth();
  const { setManualRate: saveRate } = await import("@/lib/exchange-rate");
  await saveRate(rate, new Date());
  revalidatePath("/settings");
  revalidatePath("/", "layout");
}
