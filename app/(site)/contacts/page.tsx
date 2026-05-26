import type { Metadata } from "next";
import ContactsClient from "./contacts-client";

export const metadata: Metadata = {
  title: "Контакти — NICE.car.if · Кузовний ремонт Івано-Франківськ",
  description:
    "Адреса кузовного цеху NICE.car.if: вул. Максимовича, 15, Івано-Франківськ. Телефон, Telegram, Viber, години роботи. Запишіться на оцінку.",
};

export default function ContactsPage() {
  return <ContactsClient />;
}
