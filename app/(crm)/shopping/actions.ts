"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createShoppingItem(name: string): Promise<void> {
  await prisma.shoppingListItem.create({
    data: { name: name.trim() },
  });
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function toggleShoppingItem(id: string): Promise<void> {
  const item = await prisma.shoppingListItem.findUnique({ where: { id } });
  if (!item) return;
  await prisma.shoppingListItem.update({
    where: { id },
    data: { isNeeded: !item.isNeeded },
  });
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function removeShoppingItem(id: string): Promise<void> {
  await prisma.shoppingListItem.delete({ where: { id } });
  revalidatePath("/shopping");
  revalidatePath("/");
}

export async function markAllPurchased(): Promise<void> {
  await prisma.shoppingListItem.updateMany({
    where: { isNeeded: true },
    data: { isNeeded: false },
  });
  revalidatePath("/shopping");
  revalidatePath("/");
}
