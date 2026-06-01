"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { normalizePhone } from "@/lib/phone";

function revalidate(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function updateClientNote(
  clientId: string,
  note: string
): Promise<void> {
  await requireAuth();
  await prisma.client.update({
    where: { id: clientId },
    data: { note: note.trim() || null },
  });
  revalidate(clientId);
}

export async function addVehicle(
  clientId: string,
  data: { plate: string; make: string; model: string; year?: number }
): Promise<void> {
  await requireAuth();
  const plate = data.plate.replace(/\s+/g, "").toUpperCase();
  await prisma.vehicle.create({
    data: {
      clientId,
      plateNumber: plate,
      make: data.make.trim(),
      model: data.model.trim(),
      year: data.year ?? null,
    },
  });
  revalidate(clientId);
}

export async function removeVehicle(
  vehicleId: string,
  clientId: string
): Promise<{ error?: string }> {
  await requireAuth();
  const orderCount = await prisma.order.count({ where: { vehicleId } });
  if (orderCount > 0) {
    return { error: "Не можна видалити авто з замовленнями" };
  }
  await prisma.vehicle.delete({ where: { id: vehicleId } });
  revalidate(clientId);
  return {};
}

// ── Edit client name / phone ─────────────────────────────────────────────────

const EditClientSchema = z.object({
  name:  z.string().min(2, "Імʼя — мінімум 2 символи").max(120),
  phone: z.string().regex(/^\+?\d{10,13}$/, "Невірний формат телефону"),
});

export async function editClient(
  clientId: string,
  data: { name: string; phone: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAuth();

  const parsed = EditClientSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Помилка валідації" };
  }

  const phone = normalizePhone(parsed.data.phone);

  // Унікальність телефону — якщо вже у іншого клієнта
  const existing = await prisma.client.findUnique({ where: { phone } });
  if (existing && existing.id !== clientId) {
    return { ok: false, error: "Клієнт з таким телефоном уже існує" };
  }

  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { name: parsed.data.name.trim(), phone },
    });
    revalidate(clientId);
    return { ok: true };
  } catch (err) {
    console.error("[editClient]", err);
    return { ok: false, error: "Не вдалося зберегти зміни. Спробуйте ще раз." };
  }
}

export async function deleteClient(clientId: string): Promise<{ error?: string }> {
  await requireAuth();
  try {
    await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });
    revalidatePath("/clients");
    return {};
  } catch (e) {
    console.error("[deleteClient]", e);
    return { error: "Не вдалося видалити клієнта. Спробуйте ще раз." };
  }
}
