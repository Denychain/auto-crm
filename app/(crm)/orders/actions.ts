"use server";

import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { handleOrderClosed } from "@/lib/finance";

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus
): Promise<void> {
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: newStatus,
      ...(newStatus === OrderStatus.DONE ? { readyDate: new Date() } : {}),
    },
  });

  if (newStatus === OrderStatus.CLOSED) {
    await handleOrderClosed(orderId);
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/");
}


export async function deleteOrder(orderId: string): Promise<void> {
  await prisma.order.delete({ where: { id: orderId } });
  revalidatePath("/orders");
  revalidatePath("/");
}
