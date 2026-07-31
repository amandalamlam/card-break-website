import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getBreakById, getSlotById } from "@/lib/breaks/queries";
import { formatPrice } from "@/lib/breaks/format";
import { getOrderByCheckoutSessionId } from "@/lib/stripe/orders";
import { getStripe } from "@/lib/stripe/server";
import { fulfillSlotPurchase } from "@/lib/stripe/orders";
import type { AppLocale } from "@/i18n/routing";

type SuccessPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
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

  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect({ href: "/breaks", locale: locale as AppLocale });
    throw new Error("Missing session_id.");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") {
    redirect({ href: "/breaks", locale: locale as AppLocale });
  }

  const orderId = session.metadata?.order_id;

  if (orderId) {
    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await fulfillSlotPurchase(orderId, paymentIntentId);
  }

  const order = await getOrderByCheckoutSessionId(sessionId);

  if (!order || order.user_id !== user!.id) {
    redirect({ href: "/breaks", locale: locale as AppLocale });
    throw new Error("Order not found.");
  }

  const breakItem = await getBreakById(order.break_id);
  const slot = await getSlotById(order.slot_id, order.break_id);
  const t = await getTranslations("checkout.success");

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
            <span className="font-medium">{breakItem?.title ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted">{t("slotLabel")}: </span>
            <span className="font-medium">{slot?.name ?? "—"}</span>
          </p>
          <p>
            <span className="text-muted">{t("priceLabel")}: </span>
            <span className="font-semibold text-accent-soft">
              {formatPrice(Number(order.amount))}
            </span>
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href={`/breaks/${order.break_id}`}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("viewBreak")}
          </Link>
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
