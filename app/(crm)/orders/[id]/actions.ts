"use server";

import { prisma } from "@/lib/prisma";
import { PartStatus, Currency, WorkerRole, PhotoType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getCurrentRate } from "@/lib/exchange-rate";
import { requireAuth } from "@/lib/auth";
import { computeOrderTotals } from "@/lib/finance";

function revalidate(orderId: string) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

/** Дефолтна валюта для нових грошових записів (із Settings, фолбек UAH). */
async function getDefaultCurrency(): Promise<Currency> {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
    select: { defaultCurrency: true },
  });
  return (settings?.defaultCurrency ?? Currency.UAH) as Currency;
}

// ── Works ───────────────────────────────────────────────────────────────────

export async function addWork(
  orderId: string,
  data: { name: string; price: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  const currency = data.currency ?? Currency.UAH;
  const rate = await getCurrentRate();
  await prisma.orderWork.create({
    data: {
      orderId,
      name: data.name,
      price: data.price,
      currency,
      exchangeRate: rate,
    },
  });
  revalidate(orderId);
}

export async function updateWork(
  workId: string,
  orderId: string,
  data: { name: string; price: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  // При зміні валюти — оновлюємо курс, щоб заморозити поточний курс для нового запису
  let exchangeRateUpdate: Record<string, unknown> = {};
  if (data.currency) {
    const current = await prisma.orderWork.findUnique({ where: { id: workId }, select: { currency: true } });
    if (current && current.currency !== data.currency) {
      exchangeRateUpdate = { exchangeRate: await getCurrentRate() };
    }
  }
  await prisma.orderWork.update({
    where: { id: workId },
    data: {
      name: data.name,
      price: data.price,
      ...(data.currency ? { currency: data.currency } : {}),
      ...exchangeRateUpdate,
    },
  });
  revalidate(orderId);
}

export async function deleteWork(
  workId: string,
  orderId: string
): Promise<void> {
  await requireAuth();
  await prisma.orderWork.delete({ where: { id: workId } });
  revalidate(orderId);
}

// ── Parts ───────────────────────────────────────────────────────────────────

export async function addPart(
  orderId: string,
  data: {
    name: string;
    status: PartStatus;
    estimatedPrice: number;
    actualPrice: number | null;
    currency?: Currency;
    articleCode?: string;
  }
): Promise<void> {
  await requireAuth();
  const currency = data.currency ?? Currency.UAH;
  const rate = await getCurrentRate();
  await prisma.orderPart.create({
    data: {
      orderId,
      name: data.name,
      status: data.status,
      estimatedPrice: data.estimatedPrice,
      actualPrice: data.actualPrice,
      currency,
      exchangeRate: rate,
      ...(data.articleCode ? { articleCode: data.articleCode.trim() } : {}),
    },
  });
  revalidate(orderId);
}

export async function updatePart(
  partId: string,
  orderId: string,
  data: {
    name: string;
    status: PartStatus;
    estimatedPrice: number;
    actualPrice: number | null;
    currency?: Currency;
    articleCode?: string | null;
  }
): Promise<void> {
  await requireAuth();
  // При зміні валюти — оновлюємо курс, щоб заморозити поточний курс для нового запису
  let exchangeRateUpdate: Record<string, unknown> = {};
  if (data.currency) {
    const current = await prisma.orderPart.findUnique({ where: { id: partId }, select: { currency: true } });
    if (current && current.currency !== data.currency) {
      exchangeRateUpdate = { exchangeRate: await getCurrentRate() };
    }
  }
  await prisma.orderPart.update({
    where: { id: partId },
    data: {
      name: data.name,
      status: data.status,
      estimatedPrice: data.estimatedPrice,
      actualPrice: data.actualPrice,
      ...(data.currency ? { currency: data.currency } : {}),
      ...exchangeRateUpdate,
      articleCode: data.articleCode?.trim() || null,
    },
  });
  revalidate(orderId);
}

export async function deletePart(
  partId: string,
  orderId: string
): Promise<void> {
  await requireAuth();
  await prisma.orderPart.delete({ where: { id: partId } });
  revalidate(orderId);
}

// ── Finance ─────────────────────────────────────────────────────────────────

export async function updateFinance(
  orderId: string,
  data: { totalPaid: number; advancePayment: number; estimatedPrice?: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  // При зміні валюти замовлення — заморожуємо поточний курс у baseExchangeRate
  let rateUpdate: Record<string, unknown> = {};
  if (data.currency) {
    const current = await prisma.order.findUnique({
      where: { id: orderId },
      select: { currency: true },
    });
    if (current && current.currency !== data.currency) {
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

// ── Worker shares ────────────────────────────────────────────────────────────

export async function addWorkerShare(
  orderId: string,
  data: { workerName: string; amount: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  const currency = data.currency ?? Currency.UAH;
  const rate = await getCurrentRate();
  await prisma.workerShare.create({
    data: {
      orderId,
      workerName: data.workerName,
      amount: data.amount,
      currency,
      exchangeRate: rate,
    },
  });
  revalidate(orderId);
}

export async function updateWorkerShare(
  shareId: string,
  orderId: string,
  data: { workerName: string; amount: number; currency?: Currency }
): Promise<void> {
  await requireAuth();
  await prisma.workerShare.update({
    where: { id: shareId },
    data: {
      workerName: data.workerName,
      amount: data.amount,
      ...(data.currency ? { currency: data.currency } : {}),
    },
  });
  revalidate(orderId);
}

export async function deleteWorkerShare(
  shareId: string,
  orderId: string
): Promise<void> {
  await requireAuth();
  await prisma.workerShare.delete({ where: { id: shareId } });
  revalidate(orderId);
}

// ── Worker share templates ───────────────────────────────────────────────────

/** Повертає список ролей, яких бракує для шаблону (потрібно призначити людину) */
export async function applyShareTemplate(
  orderId: string,
  templateId: string
): Promise<{ needWorkers: WorkerRole[] }> {
  await requireAuth();
  const [order, template] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { works: true, parts: true, workerShares: true },
    }),
    prisma.shareTemplate.findUnique({
      where: { id: templateId },
      include: { rules: true },
    }),
  ]);
  if (!order || !template) return { needWorkers: [] };

  // База розподілу = сума робіт (матеріали — pass-through, не діляться)
  const rate = (await getCurrentRate()).toNumber();
  const base = computeOrderTotals(order as Parameters<typeof computeOrderTotals>[0], Currency.UAH, rate).poolForPeople;

  const needWorkers: WorkerRole[] = [];

  for (const rule of template.rules) {
    // Знайти існуючий share з відповідною роллю
    const existing = order.workerShares.find((s) => s.roleSnapshot === rule.role);
    if (existing) {
      // Оновити % і перерахувати суму
      await prisma.workerShare.update({
        where: { id: existing.id },
        data: {
          sharePercent: rule.percent,
          amount: (base * rule.percent) / 100,
        },
      });
    } else {
      needWorkers.push(rule.role);
    }
  }

  revalidate(orderId);
  return { needWorkers };
}

export async function addWorkerShareFromDirectory(
  orderId: string,
  workerId: string,
  role: WorkerRole,
  sharePercent: number | null,
  fixedAmount: number | null
): Promise<void> {
  await requireAuth();
  const [order, worker] = await Promise.all([
    prisma.order.findUnique({
      where: { id: orderId },
      include: { works: true, parts: true },
    }),
    prisma.worker.findUnique({ where: { id: workerId } }),
  ]);
  if (!order || !worker) return;

  // База розподілу = сума робіт (матеріали — pass-through, не діляться)
  const rate = await getCurrentRate();
  const base = computeOrderTotals(order as Parameters<typeof computeOrderTotals>[0], Currency.UAH, rate.toNumber()).poolForPeople;

  const amount =
    sharePercent != null ? (base * sharePercent) / 100 : (fixedAmount ?? 0);
  await prisma.workerShare.create({
    data: {
      orderId,
      workerId,
      workerName: worker.name,
      roleSnapshot: role,
      sharePercent: sharePercent,
      amount,
      currency: Currency.UAH,
      exchangeRate: rate,
    },
  });
  revalidate(orderId);
}

export async function updateWorkerSharePercent(
  shareId: string,
  orderId: string,
  sharePercent: number
): Promise<void> {
  await requireAuth();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { works: true, parts: true },
  });
  if (!order) return;

  // База розподілу = сума робіт (матеріали — pass-through, не діляться)
  const rate = (await getCurrentRate()).toNumber();
  const base = computeOrderTotals(order as Parameters<typeof computeOrderTotals>[0], Currency.UAH, rate).poolForPeople;

  await prisma.workerShare.update({
    where: { id: shareId },
    data: {
      sharePercent,
      amount: (base * sharePercent) / 100,
    },
  });
  revalidate(orderId);
}

export async function updateWorkerShareAmount(
  shareId: string,
  orderId: string,
  amount: number
): Promise<void> {
  await requireAuth();
  await prisma.workerShare.update({
    where: { id: shareId },
    data: { sharePercent: null, amount },
  });
  revalidate(orderId);
}

export async function removeWorkerShare(
  shareId: string,
  orderId: string
): Promise<void> {
  await requireAuth();
  await prisma.workerShare.delete({ where: { id: shareId } });
  revalidate(orderId);
}

// ── Photos ───────────────────────────────────────────────────────────────────

export async function deletePhoto(
  photoId: string,
  orderId: string
): Promise<void> {
  await requireAuth();
  await prisma.orderPhoto.delete({ where: { id: photoId } });
  revalidate(orderId);
}

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
