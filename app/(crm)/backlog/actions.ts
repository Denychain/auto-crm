"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { OrderStatus } from "@prisma/client";
import { format } from "date-fns";
import { uk } from "date-fns/locale";
import { requireAuth } from "@/lib/auth";

export async function moveFromBacklogToActive(orderId: string): Promise<void> {
  await requireAuth();
  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.DISASSEMBLY },
  });
  revalidatePath("/backlog");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
}

export async function cancelBacklogEntry(orderId: string): Promise<void> {
  await requireAuth();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { clientId: true },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.POSTPONED },
  });

  if (order) {
    const client = await prisma.client.findUnique({
      where: { id: order.clientId },
      select: { note: true },
    });
    const dateStr = format(new Date(), "d MMM yyyy", { locale: uk });
    const line = `Скасовано з черги ${dateStr} (перевірити повернення завдатку)`;
    await prisma.client.update({
      where: { id: order.clientId },
      data: { note: client?.note ? `${client.note}\n${line}` : line },
    });
  }

  revalidatePath("/backlog");
  revalidatePath("/orders");
}
