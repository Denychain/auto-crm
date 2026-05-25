import { BottomNav } from "@/components/layout/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { MobileSettingsMenu } from "@/components/layout/MobileSettingsMenu";
import { Toaster } from "@/components/ui/sonner";
import { OfflineBanner } from "@/components/OfflineBanner";
import { InstallPrompt } from "@/components/InstallPrompt";
import { CurrencyProvider } from "@/components/providers/CurrencyProvider";
import { FloatingCalculator } from "@/components/layout/FloatingCalculator";
import { prisma } from "@/lib/prisma";
import { getCurrentRate } from "@/lib/exchange-rate";
import { Currency } from "@prisma/client";
import { requireAuth } from "@/lib/auth";

export const metadata = { robots: { index: false, follow: false } };

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();
  const [settings, rate] = await Promise.all([
    prisma.settings.findUnique({ where: { id: "singleton" } }),
    getCurrentRate().then((r) => r.toNumber()).catch(() => null),
  ]);
  const displayCurrency = (settings?.displayCurrency ?? Currency.UAH) as Currency;

  return (
    <CurrencyProvider initialDisplayCurrency={displayCurrency} initialRate={rate}>
      <OfflineBanner />
      <div className="flex h-full">
        <SideNav className="hidden md:flex" />

        {/* Мобільний wrapper: тонка шапка з кнопкою налаштувань + контент */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Шапка тільки на мобільному — прихована на md+ де є SideNav */}
          <div className="flex h-12 shrink-0 items-center justify-end border-b border-border px-3 md:hidden">
            <MobileSettingsMenu />
          </div>

          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>
      <BottomNav className="md:hidden" />
      <FloatingCalculator />
      <Toaster />
      <InstallPrompt />
    </CurrencyProvider>
  );
}
