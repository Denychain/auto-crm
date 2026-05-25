"use server";

import { prisma } from "@/lib/prisma";
import { WorkerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

function revalidate() {
  revalidatePath("/settings/share-templates");
}

export async function createShareTemplate(data: {
  name: string;
  description: string;
  isDefault: boolean;
  rules: { role: WorkerRole; percent: number }[];
}): Promise<void> {
  await requireAuth();
  const count = await prisma.shareTemplate.count();
  if (data.isDefault) {
    await prisma.shareTemplate.updateMany({ data: { isDefault: false } });
  }
  await prisma.shareTemplate.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim() || null,
      isDefault: data.isDefault,
      sortOrder: count,
      rules: { create: data.rules },
    },
  });
  revalidate();
}

export async function updateShareTemplate(
  id: string,
  data: {
    name: string;
    description: string;
    isDefault: boolean;
    rules: { role: WorkerRole; percent: number }[];
  }
): Promise<void> {
  await requireAuth();
  if (data.isDefault) {
    await prisma.shareTemplate.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
  }
  // Replace rules entirely
  await prisma.shareTemplateRule.deleteMany({ where: { templateId: id } });
  await prisma.shareTemplate.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description.trim() || null,
      isDefault: data.isDefault,
      rules: { create: data.rules },
    },
  });
  revalidate();
}

export async function deleteShareTemplate(id: string): Promise<void> {
  await requireAuth();
  await prisma.shareTemplate.delete({ where: { id } });
  revalidate();
}
