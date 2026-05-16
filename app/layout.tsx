import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: { default: "АвтоCRM", template: "%s · АвтоCRM" },
  description: "CRM-система для автосервісу — фарбування та рихтування",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "АвтоCRM" },
  openGraph: { type: "website", title: "АвтоСервіс CRM", description: "CRM-система для автосервісу — фарбування та рихтування", siteName: "АвтоCRM" },
  twitter: { card: "summary", title: "АвтоСервіс CRM", description: "CRM-система для автосервісу" },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk" className={`${inter.variable} h-full antialiased`}>
      <body className="h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
