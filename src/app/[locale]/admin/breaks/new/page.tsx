import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CreateBreakForm } from "./CreateBreakForm";
import type { AppLocale } from "@/i18n/routing";

export default async function AdminNewBreakPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  const t = await getTranslations("admin");

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("newBreakTitle")}</h1>
        <p className="text-muted">{t("newBreakSubtitle")}</p>
      </div>
      <CreateBreakForm locale={locale as AppLocale} />
    </div>
  );
}
