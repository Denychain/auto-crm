"use server";

import { prisma } from "@/lib/prisma";
import { OrderStatus, PhotoType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { getCurrentRate } from "@/lib/exchange-rate";

export async function searchVehicleByPlate(
  plate: string
): Promise<{ vehicle: { id: string; make: string; model: string; year: number | null }; client: { id: string; name: string; phone: string } } | null> {
  await requireAuth();
  const vehicle = await prisma.vehicle.findUnique({
    where: { plateNumber: plate.toUpperCase() },
    include: { client: true },
  });

  if (!vehicle) return null;
  return {
    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
    },
    client: {
      id: vehicle.client.id,
      name: vehicle.client.name,
      phone: vehicle.client.phone,
    },
  };
}

export async function searchClientByPhone(
  phone: string
): Promise<{ id: string; name: string; phone: string } | null> {
  await requireAuth();
  const client = await prisma.client.findUnique({
    where: { phone },
  });

  if (!client) return null;
  return { id: client.id, name: client.name, phone: client.phone };
}

export async function createOrderWithPhotos(data: {
  plate: string;
  make: string;
  model: string;
  year?: number;
  clientName: string;
  clientPhone: string;
  description?: string;
  estimatedPrice: number;
  advancePayment: number;
  photoUrls: string[];
}): Promise<{ orderId: string }> {
  await requireAuth();
  // Upsert client by phone
  const client = await prisma.client.upsert({
    where: { phone: data.clientPhone },
    create: { name: data.clientName, phone: data.clientPhone },
    update: {},
  });

  // Upsert vehicle by plate
  const vehicle = await prisma.vehicle.upsert({
    where: { plateNumber: data.plate.toUpperCase() },
    create: {
      clientId: client.id,
      plateNumber: data.plate.toUpperCase(),
      make: data.make,
      model: data.model,
      year: data.year ?? null,
    },
    update: {},
  });

  // B08: fetch current exchange rate to store at order creation time
  const baseExchangeRate = await getCurrentRate();

  // Create order
  const order = await prisma.order.create({
    data: {
      clientId: client.id,
      vehicleId: vehicle.id,
      status: OrderStatus.QUEUE,
      description: data.description || null,
      estimatedPrice: data.estimatedPrice,
      advancePayment: data.advancePayment,
      totalPaid: 0,
      baseExchangeRate,
    },
  });

  // Create ACT_IN photos
  if (data.photoUrls.length > 0) {
    await prisma.orderPhoto.createMany({
      data: data.photoUrls.map((url) => ({
        orderId: order.id,
        url,
        type: PhotoType.ACT_IN,
      })),
    });
  }

  revalidatePath("/orders");

  return { orderId: order.id };
}
