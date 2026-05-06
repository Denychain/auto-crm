"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function revalidate(clientId: string) {
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function updateClientNote(
  clientId: string,
  note: string
): Promise<void> {
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
  const orderCount = await prisma.order.count({ where: { vehicleId } });
  if (orderCount > 0) {
    return { error: "Не можна видалити авто з замовленнями" };
  }
  await prisma.vehicle.delete({ where: { id: vehicleId } });
  revalidate(clientId);
  return {};
}

export async function deleteClient(clientId: string): Promise<{ error?: string }> {
  const orderCount = await prisma.order.count({ where: { clientId } });
  if (orderCount > 0) {
    return { error: "Не можна видалити клієнта з замовленнями" };
  }
  await prisma.client.delete({ where: { id: clientId } });
  revalidatePath("/clients");
  return {};
}
