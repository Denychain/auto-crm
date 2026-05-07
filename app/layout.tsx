import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { prisma } from "@/lib/prisma";
import { getCurrentRate } from "@/lib/exchange-rate";
import { Currency } from "@prisma/client";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: {
    default: "АвтоCRM",
    template: "%s · АвтоCRM",
  },
  description: "CRM-система для автосервісу — фарбування та рихтування",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "АвтоCRM",
  },
  openGraph: {
    type: "website",
    title: "АвтоСервіс CRM",
    description: "CRM-система для автосервісу — фарбування та рихтування",
    siteName: "АвтоCRM",
  },
  twitter: {
    card: "summary",
    title: "АвтоСервіс CRM",
    description: "CRM-система для автосервісу",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, rate] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    getCurrentRate().then((r) => r.toNumber()).catch(() => null),
  ]);

  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;

  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <CurrencyProvider initialDisplayCurrency={displayCurrency} initialRate={rate}>
          <OfflineBanner />

          <div className="flex h-full">
            <SideNav className="hidden md:flex" />
            <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
              {children}
            </main>
          </div>

          <BottomNav className="md:hidden" />
          <Toaster />
          <InstallPrompt />
        </CurrencyProvider>
      </body>
    </html>
  );
}
