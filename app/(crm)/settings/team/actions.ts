"use server";

import { prisma } from "@/lib/prisma";
import { WorkerRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

function revalidate() {
  revalidatePath("/settings/team");
}

export async function createWorker(data: {
  name: string;
  roles: WorkerRole[];
  defaultShare: number | null;
  notes: string;
}): Promise<void> {
  await requireAuth();
  const count = await prisma.worker.count();
  await prisma.worker.create({
    data: {
      name: data.name.trim(),
      roles: data.roles,
      defaultShare: data.defaultShare,
      notes: data.notes.trim() || null,
      sortOrder: count,
    },
  });
  revalidate();
}

export async function updateWorker(
  id: string,
  data: {
    name: string;
    roles: WorkerRole[];
    defaultShare: number | null;
    notes: string;
    isActive: boolean;
  }
): Promise<void> {
  await requireAuth();
  await prisma.worker.update({
    where: { id },
    data: {
      name: data.name.trim(),
      roles: data.roles,
      defaultShare: data.defaultShare,
      notes: data.notes.trim() || null,
      isActive: data.isActive,
    },
  });
  revalidate();
}

export async function deactivateWorker(id: string): Promise<void> {
  await requireAuth();
  await prisma.worker.update({
    where: { id },
    data: { isActive: false },
  });
  revalidate();
}

export async function updateWorkerOrder(ids: string[]): Promise<void> {
  await requireAuth();
  await Promise.all(
    ids.map((id, idx) =>
      prisma.worker.update({ where: { id }, data: { sortOrder: idx } })
    )
  );
  revalidate();
}
