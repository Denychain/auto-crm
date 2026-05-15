"use server";

import { prisma } from "@/lib/prisma";
import { PartStatus, Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { calcOrderTotal } from "@/lib/utils";
import { getCurrentRate } from "@/lib/exchange-rate";

function revalidate(orderId: string) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
}

// ── Works ───────────────────────────────────────────────────────────────────

export async function addWork(
  orderId: string,
  data: { name: string; price: number; currency?: Currency }
): Promise<void> {
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
  await prisma.orderWork.update({
    where: { id: workId },
    data: {
      name: data.name,
      price: data.price,
      ...(data.currency ? { currency: data.currency } : {}),
    },
  });
  revalidate(orderId);
}

export async function deleteWork(
  workId: string,
  orderId: string
): Promise<void> {
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
  await prisma.orderPart.update({
    where: { id: partId },
    data: {
      name: data.name,
      status: data.status,
      estimatedPrice: data.estimatedPrice,
      actualPrice: data.actualPrice,
      ...(data.currency ? { currency: data.currency } : {}),
      articleCode: data.articleCode?.trim() || null,
    },
  });
  revalidate(orderId);
}

export async function deletePart(
  partId: string,
  orderId: string
): Promise<void> {
  await prisma.orderPart.delete({ where: { id: partId } });
  revalidate(orderId);
}

// ── Finance ─────────────────────────────────────────────────────────────────

export async function updateFinance(
  orderId: string,
  data: { totalPaid: number; advancePayment: number; estimatedPrice?: number }
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      totalPaid: data.totalPaid,
      advancePayment: data.advancePayment,
      ...(data.estimatedPrice !== undefined ? { estimatedPrice: data.estimatedPrice } : {}),
    },
  });
  revalidate(orderId);
}

// ── Worker shares ────────────────────────────────────────────────────────────

export async function addWorkerShare(
  orderId: string,
  data: { workerName: string; amount: number; currency?: Currency }
): Promise<void> {
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
  await prisma.workerShare.delete({ where: { id: shareId } });
  revalidate(orderId);
}

// ── Worker share templates ───────────────────────────────────────────────────

export async function applyShareTemplate(
  orderId: string,
  template: "50/50" | "30/30/30"
): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { works: true, parts: true },
  });
  if (!order) return;

  const total = calcOrderTotal(order.works, order.parts);
  const slots =
    template === "50/50"
      ? [
          { workerName: "Майстер 1", amount: total / 2 },
          { workerName: "Майстер 2", amount: total / 2 },
        ]
      : [
          { workerName: "Майстер 1", amount: total / 3 },
          { workerName: "Майстер 2", amount: total / 3 },
          { workerName: "Майстер 3", amount: total / 3 },
        ];

  await prisma.workerShare.deleteMany({ where: { orderId } });
  await prisma.workerShare.createMany({
    data: slots.map((s) => ({ orderId, workerName: s.workerName, amount: s.amount })),
  });
  revalidate(orderId);
}

// ── Photos ───────────────────────────────────────────────────────────────────

export async function deletePhoto(
  photoId: string,
  orderId: string
): Promise<void> {
  await prisma.orderPhoto.delete({ where: { id: photoId } });
  revalidate(orderId);
}
