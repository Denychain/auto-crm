"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createClient(data: {
  name: string;
  phone: string;
  note?: string;
  vehicle?: { plate: string; make: string; model: string; year?: number };
}): Promise<{ clientId: string }> {
  const client = await prisma.client.create({
    data: {
      name: data.name.trim(),
      phone: data.phone.trim(),
      note: data.note?.trim() || null,
    },
  });

  if (data.vehicle) {
    const plate = data.vehicle.plate.replace(/\s+/g, "").toUpperCase();
    await prisma.vehicle.create({
      data: {
        clientId: client.id,
        plateNumber: plate,
        make: data.vehicle.make.trim(),
        model: data.vehicle.model.trim(),
        year: data.vehicle.year ?? null,
      },
    });
  }

  revalidatePath("/clients");
  return { clientId: client.id };
}
