"use server";

import { prisma } from "@/lib/prisma";
import { OrderStatus, Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { handleOrderClosed, computeOrderTotals, toN, type OrderForTotals } from "@/lib/finance";
import { requireAuth } from "@/lib/auth";

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<{ warning?: string }> {
  await requireAuth();

  const data: Record<string, unknown> = {
    status: newStatus,
    ...(newStatus === OrderStatus.DONE ? { readyDate: new Date() } : {}),
    ...(newStatus === OrderStatus.CLOSED ? { closedAt: new Date() } : {}),
  };

  await prisma.order.update({
    where: { id: orderId },
    data,
  });

  let warning: string | undefined;

  if (newStatus === OrderStatus.CLOSED) {
    // Перевірка інваріанту: orderTotal ≈ totalPaid + advancePayment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { works: true, parts: true },
    });
    if (order) {
      const latestRate = await prisma.exchangeRate.findFirst({ orderBy: { date: "desc" } });
      const fallbackRate = toN(latestRate?.usdToUah) || 41;
      const orderCurrency = (order.currency as Currency) ?? Currency.UAH;
      const totals = computeOrderTotals(order as unknown as OrderForTotals, orderCurrency, fallbackRate);
      const outstanding = totals.outstanding;
      if (outstanding > 0.01) {
        warning = `Увага: залишок ${outstanding.toFixed(2)} ${orderCurrency} не погашено`;
        console.warn(`[closeOrder] ${orderId}: ${warning}`);
      }
    }

    await handleOrderClosed(orderId);

    revalidatePath("/finance");
    revalidatePath("/");
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");

  return { warning };
}


export async function deleteOrder(orderId: string): Promise<void> {
  await requireAuth();
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/orders");
  revalidatePath("/");
}
