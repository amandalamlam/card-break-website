import { redirect } from "@/i18n/navigation";
import { setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import type { AppLocale } from "@/i18n/routing";

export default async function AdminWithdrawalsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  redirect({ href: "/admin?tab=withdrawals", locale: locale as AppLocale });
}
