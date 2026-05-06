import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BottomNav } from "@/components/layout/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "АвтоСервіс CRM",
  description: "CRM-система для автосервісу — фарбування та рихтування",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "АвтоCRM",
  },
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        <div className="flex h-full">
          {/* Desktop sidebar — hidden on mobile */}
          <SideNav className="hidden md:flex" />

          {/* Main content */}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>

        {/* Mobile bottom nav — hidden on desktop */}
        <BottomNav className="md:hidden" />
        <Toaster />
      </body>
    </html>
  );
}
