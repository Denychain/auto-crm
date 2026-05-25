"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

export async function createDreamFund(
  goalName: string,
  targetAmount: number
): Promise<void> {
  await requireAuth();
  await prisma.dreamFund.create({
    data: { goalName: goalName.trim(), targetAmount },
  });
  revalidatePath("/finance");
}

export async function updateDreamFund(
  id: string,
  data: { goalName?: string; targetAmount?: number }
): Promise<void> {
  await requireAuth();
  await prisma.dreamFund.update({
    where: { id },
    data: {
      ...(data.goalName !== undefined ? { goalName: data.goalName.trim() } : {}),
      ...(data.targetAmount !== undefined ? { targetAmount: data.targetAmount } : {}),
    },
  });
  revalidatePath("/finance");
}

export async function deleteDreamFund(id: string): Promise<void> {
  await requireAuth();
  await prisma.dreamFund.delete({ where: { id } });
  revalidatePath("/finance");
}
