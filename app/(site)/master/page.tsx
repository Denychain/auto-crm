import type { Metadata } from "next";
import MasterClient from "./master-client";

export const metadata: Metadata = {
  title: "Про майстра — NICE.car.if · Дмитро, власник і колорист",
  description:
    "Дмитро — власник кузовного цеху NICE.car.if в Івано-Франківську. 25 років у ремеслі, особисто фарбує кожне авто. Спеціалізація: Xirallic, тришаровий перламутр, авто з США.",
};

export default function MasterPage() {
  return <MasterClient />;
}
