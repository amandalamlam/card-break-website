import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminShippingOptionsPanel } from "@/components/admin/AdminShippingOptionsPanel";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getAllShippingOptions } from "@/lib/shipping/actions";
import type { AppLocale } from "@/i18n/routing";

export default async function AdminShippingOptionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  await requireAdmin(locale as AppLocale);

  const t = await getTranslations("admin.shippingOptions");
  const options = await getAllShippingOptions();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="text-muted">{t("subtitle")}</p>
        </div>
        <Link
          href="/admin?tab=shipping"
          className="rounded-xl border border-border px-5 py-3 text-sm text-muted transition hover:text-foreground"
        >
          {t("backToShipping")}
        </Link>
      </div>

      <AdminShippingOptionsPanel options={options} />
    </div>
  );
}
