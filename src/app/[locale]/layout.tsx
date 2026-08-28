import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { NavigationProgressBar } from "@/components/NavigationProgressBar";
import { CartCountdownBanner } from "@/components/cart/CartCountdownBanner";
import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { SiteFooter } from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AuthSessionProvider } from "@/context/AuthSessionContext";
import { CartProvider } from "@/context/CartContext";
import { getAuthContext } from "@/lib/auth/session";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const { user, profile } = await getAuthContext();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
        <NavigationProgressBar />
        <NextIntlClientProvider messages={messages}>
          <AuthSessionProvider
            initialIsAuthenticated={!!user}
            initialIsAdmin={profile?.role === "admin"}
          >
            <CartProvider isLoggedIn={!!user}>
              <ToastProvider>
                <div className="flex min-h-screen flex-col">
                  <div className="sticky top-0 z-50 bg-background">
                    <SiteHeaderClient />
                    <CartCountdownBanner />
                  </div>
                  <main className="flex-1">{children}</main>
                  <SiteFooter />
                </div>
              </ToastProvider>
            </CartProvider>
          </AuthSessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
