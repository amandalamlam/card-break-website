import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { CartCountdownBanner } from "@/components/cart/CartCountdownBanner";
import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { SiteFooter } from "@/components/SiteFooter";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { CartProvider } from "@/context/CartContext";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
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
  const user = await getCurrentUser();
  const profile = user ? await getCurrentProfile() : null;

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans`}>
        <NextIntlClientProvider messages={messages}>
          <CartProvider isLoggedIn={!!user}>
            <ToastProvider>
              <div className="flex min-h-screen flex-col">
                <div className="sticky top-0 z-50 bg-background">
                  <SiteHeaderClient
                    isLoggedIn={!!user}
                    isAdmin={profile?.role === "admin"}
                  />
                  <CartCountdownBanner />
                </div>
                <main className="flex-1">{children}</main>
                <SiteFooter />
              </div>
            </ToastProvider>
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
