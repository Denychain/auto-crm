"use server";

import { z } from "zod";
import { customAlphabet } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import { getCurrentRate } from "@/lib/exchange-rate";
import { revalidatePath } from "next/cache";

// TODO: add rate-limiting via Upstash Redis when UPSTASH_REDIS_REST_URL is set
// import { Ratelimit } from "@upstash/ratelimit";
// import { Redis } from "@upstash/redis";

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

// ── Validation schema ────────────────────────────────────────────────────────
const schema = z.object({
  name:     z.string().min(2, "Введіть ім'я (мінімум 2 символи)"),
  phone:    z
    .string()
    .regex(
      /^\+?3?8?(0\d{9})$/,
      "Введіть коректний номер телефону (+380XXXXXXXXX)"
    ),
  car:      z.string().optional(),
  damage:   z.string().optional(),
  photoUrls: z.array(z.string().url()).max(5).default([]),
  // honeypot — must be empty
  website:  z.string().optional(),
});

export type ContactRequestInput = z.infer<typeof schema>;
export type ContactRequestResult =
  | { ok: true;  orderId: string }
  | { ok: false; error: string  };

// ── Phone normalizer → +380XXXXXXXXX ────────────────────────────────────────
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // e.g. 0931234567 → 380931234567; or already 380931234567
  const core = digits.startsWith("38") ? digits : "38" + digits;
  return "+" + core;
}

// ── Server action ────────────────────────────────────────────────────────────
export async function submitContactRequest(
  input: ContactRequestInput
): Promise<ContactRequestResult> {
  try {
    // 1. Parse + validate
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Помилка валідації";
      return { ok: false, error: msg };
    }
    const { name, phone, car, damage, photoUrls, website } = parsed.data;

    // 2. Honeypot check — bots fill the hidden "website" field
    if (website) {
      // Silently accept so bots don't know they were caught
      return { ok: true, orderId: "" };
    }

    const normalizedPhone = normalizePhone(phone);

    // 3. Upsert client by phone (prevent duplicates)
    const client = await prisma.client.upsert({
      where:  { phone: normalizedPhone },
      update: {},                           // keep existing name if already in base
      create: { name, phone: normalizedPhone },
    });

    // 4. Parse car description → make / model
    const [make = "Невідомо", ...rest] = (car ?? "").trim().split(" ");
    const model = rest.join(" ") || "Невідомо";

    // 5. Create temporary vehicle with pending plate
    const vehicle = await prisma.vehicle.create({
      data: {
        clientId:    client.id,
        plateNumber: `PEND-${nanoid()}`,
        make,
        model,
      },
    });

    // 6. Get current exchange rate for baseExchangeRate
    let baseRate: Decimal | null = null;
    try {
      baseRate = await getCurrentRate();
    } catch {
      // fallback: proceed without rate; Prisma field is optional
    }

    // 7. Create order
    const order = await prisma.order.create({
      data: {
        clientId:        client.id,
        vehicleId:       vehicle.id,
        status:          "QUEUE",
        description:     damage ?? null,
        fromWebsite:     true,
        estimatedPrice:  0,
        advancePayment:  0,
        totalPaid:       0,
        baseExchangeRate: baseRate ?? undefined,
      },
    });

    // 8. Attach photos if any
    if (photoUrls.length > 0) {
      await prisma.orderPhoto.createMany({
        data: photoUrls.map((url) => ({
          orderId: order.id,
          url,
          type: "ACT_IN" as const,
        })),
      });
    }

    // 9. Revalidate CRM dashboard so widget refreshes
    revalidatePath("/dashboard");
    revalidatePath("/orders");

    return { ok: true, orderId: order.id };
  } catch (err) {
    console.error("[submitContactRequest]", err);
    const msg =
      err instanceof Error ? err.message : "Невідома помилка сервера";
    return { ok: false, error: msg };
  }
}
