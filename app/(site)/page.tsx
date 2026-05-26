import type { Metadata } from "next";
import LandingClient from "./landing-client";

export const metadata: Metadata = {
  title: "NICE.car.if — Кузовний ремонт. Івано-Франківськ.",
  description:
    "Кузовний ремонт та фарбування авто в Івано-Франківську. Власник сервісу особисто фарбує кожне авто. Підбір кольору спектрофотометром. Авто з США під ключ.",
};

export default function LandingPage() {
  return <LandingClient />;
}
