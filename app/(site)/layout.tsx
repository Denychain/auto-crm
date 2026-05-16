import "./site.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NICE.car.if — Кузовний ремонт. Івано-Франківськ.",
  description: "Кузовний ремонт та фарбування авто в Івано-Франківську. Підбір фарби в лабораторії. Гарантія 1 рік. Записуватись за телефоном.",
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
