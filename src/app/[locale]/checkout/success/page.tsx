import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/breaks/format";
import { buildPaymentReceipt } from "@/lib/orders/queries";
import { resolvePaidOrderForSuccessPage } from "@/lib/stripe/complete-checkout";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type SuccessPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string; order_id?: string }>;
};

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: SuccessPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/auth/login", locale: locale as AppLocale });
  }

  const { session_id: sessionId, order_id: orderIdParam } = await searchParams;

  const result = await resolvePaidOrderForSuccessPage(sessionId, orderIdParam);

  if (!result.ok || result.order.user_id !== user!.id) {
    redirect({ href: "/breaks", locale: locale as AppLocale });
    throw new Error("Order not found or not paid.");
  }

  const receipt = buildPaymentReceipt(result.order);
  const t = await getTranslations("checkout.success");

  const primaryItem = receipt.items[0];
  const itemSummary =
    receipt.items.length === 1
      ? primaryItem?.position_name ?? "—"
      : t("itemsMulti", { count: receipt.items.length });

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <div className="glass-panel rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-success/30 bg-success/10 text-3xl">
          ✓
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{t("subtitle")}</p>

        <div className="mt-6 space-y-2 rounded-2xl border border-border bg-background/50 p-4 text-left text-sm">
          <p>
            <span className="text-muted">{t("breakLabel")}: </span>
            <span className="font-medium">{primaryItem?.break_title ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted">{t("slotLabel")}: </span>
            <span className="font-medium">{itemSummary}</span>
          </p>
          <p>
            <span className="text-muted">{t("priceLabel")}: </span>
            <span className="font-semibold text-accent-soft">
              {formatPrice(receipt.totalAmount)}
            </span>
          </p>
          {receipt.creditPaid > 0 ? (
            <p>
              <span className="text-muted">{t("creditLabel")}: </span>
              <span className="font-medium">{formatPrice(receipt.creditPaid)}</span>
            </p>
          ) : null}
          {receipt.stripePaid > 0 ? (
            <p>
              <span className="text-muted">{t("stripeLabel")}: </span>
              <span className="font-medium">{formatPrice(receipt.stripePaid)}</span>
            </p>
          ) : null}
          <p>
            <span className="text-muted">{t("paymentMethodLabel")}: </span>
            <span className="font-medium">{t(`paymentMethods.${receipt.paymentType}`)}</span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {receipt.breakId ? (
            <Link
              href={`/breaks/${receipt.breakId}`}
              className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
            >
              {t("viewBreak")}
            </Link>
          ) : null}
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
