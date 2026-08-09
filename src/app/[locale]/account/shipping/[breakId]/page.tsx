import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link, redirect } from "@/i18n/navigation";
import { ShippingRequestForm } from "@/components/shipping/ShippingRequestForm";
import { ShippingRequestReceipt } from "@/components/shipping/ShippingRequestReceipt";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { getShippingRequestForUserBreak } from "@/lib/shipping/actions";
import type { AppLocale } from "@/i18n/routing";

type ShippingPageProps = {
  params: Promise<{ locale: string; breakId: string }>;
};

export default async function AccountShippingPage({ params }: ShippingPageProps) {
  const { locale, breakId } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account/shipping/${breakId}`, "login"),
      locale: locale as AppLocale,
    });
  }

  const { break: breakItem, options } = await getShippingRequestForUserBreak(user!.id, breakId);
  const t = await getTranslations("shipping");

  if (!breakItem) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <Link
        href="/account"
        className="inline-flex text-sm text-muted transition hover:text-foreground"
      >
        {t("backToAccount")}
      </Link>

      <div className="mt-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{breakItem.title}</h1>
        <p className="text-muted">{t("pageSubtitle")}</p>
      </div>

      <div className="glass-panel mt-8 rounded-3xl p-8">
        {breakItem.shippingRequest ? (
          <ShippingRequestReceipt request={breakItem.shippingRequest} />
        ) : (
          <ShippingRequestForm breakItem={breakItem} options={options} />
        )}
      </div>
    </div>
  );
}
