import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { handleBuyNowCheckoutCancel } from "@/lib/stripe/checkout-cancel";
import { releaseExpiredSlotLocks } from "@/lib/slots/locking";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type FailedPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ order_id?: string; mode?: string; reason?: string }>;
};

export default async function CheckoutFailedPage({ params, searchParams }: FailedPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const appLocale = locale as AppLocale;

  const { order_id: orderId, mode, reason } = await searchParams;

  // Legacy cart cancel URLs → route to cart handler
  if (orderId && mode === "cart") {
    redirect({
      href: `/cart?cancelled=1&order_id=${encodeURIComponent(orderId)}`,
      locale: appLocale,
    });
  }

  await releaseExpiredSlotLocks().catch(() => {
    /* Best-effort cleanup */
  });

  let breakId: string | null = null;

  if (orderId) {
    const user = await getCurrentUser();
    if (user) {
      const result = await handleBuyNowCheckoutCancel(orderId);
      breakId = result.breakId;
    }
  }

  const t = await getTranslations("checkout.failed");

  const messageKey =
    reason === "timeout" ? "timeout" : reason === "cancelled" ? "cancelled" : "default";

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-3xl text-red-200">
          ✕
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{t(messageKey)}</p>
        <p className="mt-2 text-xs text-muted">{t("buyNowNote")}</p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {breakId ? (
            <Link
              href={`/breaks/${breakId}`}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
            >
              {t("backToBreak")}
            </Link>
          ) : (
            <Link
              href="/breaks"
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
            >
              {t("browseBreaks")}
            </Link>
          )}
          <Link
            href="/account"
            className="rounded-xl border border-border px-5 py-3 text-sm text-muted transition hover:text-foreground"
          >
            {t("viewAccount")}
          </Link>
        </div>
      </div>
    </div>
  );
}
