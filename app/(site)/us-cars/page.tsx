import { Suspense } from "react";
import type { Metadata } from "next";
import UsCarsClient from "./us-cars-client";

export const metadata: Metadata = {
  title: "Авто з США під ключ — NICE.car.if · Івано-Франківськ",
  description:
    "Пригін авто з американських аукціонів Copart та IAAI: підбір лоту, доставка, розтаможення, кузовний ремонт і видача ключів. Власник сервісу особисто оцінює кожен лот.",
};

export default function UsCarsPage() {
  return (
    <Suspense>
      <UsCarsClient />
    </Suspense>
  );
}
