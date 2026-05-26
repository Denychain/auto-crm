import { Suspense } from "react";
import type { Metadata } from "next";
import GalleryClient from "./gallery-client";

export const metadata: Metadata = {
  title: "Галерея робіт — NICE.car.if · Кузовний ремонт Івано-Франківськ",
  description:
    "Реальні фото кузовних робіт: фарбування, рихтування, полірування, авто з США. Архів NICE.car.if з 2014 року. Без рендерів — тільки живі фото з цеху.",
};

export default function GalleryPage() {
  return (
    <Suspense>
      <GalleryClient />
    </Suspense>
  );
}
