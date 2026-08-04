import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { WalletActivityList } from "@/components/account/WalletActivityList";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/breaks/format";
import { getUserWalletTransactions } from "@/lib/wallet/credit";
import { buildWalletActivityViewModel } from "@/lib/wallet/display";
import { parseWalletBalance } from "@/lib/wallet/types";
import type { AppLocale } from "@/i18n/routing";

type AccountPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account`, "login"),
      locale: locale as AppLocale,
    });
    throw new Error("Profile missing after auth redirect.");
  }

  const { email, phone, role } = profile;
  const wallet = parseWalletBalance(profile);
  const transactions = await getUserWalletTransactions(user.id, 10);
  const t = await getTranslations("account");

  const walletActivityCopy = {
    positionsUnit: t.raw("walletActivity.positionsUnit") as string,
    paymentBreakdown: {
      creditFull: t.raw("walletActivity.paymentBreakdown.creditFull") as string,
      hybrid: t.raw("walletActivity.paymentBreakdown.hybrid") as string,
      stripeFull: t.raw("walletActivity.paymentBreakdown.stripeFull") as string,
      stripePartial: t.raw("walletActivity.paymentBreakdown.stripePartial") as string,
    },
    transactionTypes: {
      cancellation_refund: t("transactionTypes.cancellation_refund"),
      purchase: t("transactionTypes.purchase"),
      checkout_release: t("transactionTypes.checkout_release"),
      admin_adjustment: t("transactionTypes.admin_adjustment"),
      withdrawal: t("transactionTypes.withdrawal"),
      withdrawal_reversal: t("transactionTypes.withdrawal_reversal"),
    },
  };

  const activities = transactions.map((tx) =>
    buildWalletActivityViewModel(tx, locale, walletActivityCopy)
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="glass-panel space-y-6 rounded-3xl p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("email")}</p>
            <p className="mt-1 font-medium">{email}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("phone")}</p>
            <p className="mt-1 font-medium">{phone}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("wallet")}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-2xl font-semibold text-accent-soft">
                {formatPrice(wallet.availableCredit)}
              </p>
              <Link href="/account/withdraw" className="withdraw-action-link">
                <span className="withdraw-action-link__label">{t("withdrawals.openAction")}</span>
              </Link>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("walletReserved")}</p>
            <p className="mt-1 font-medium">{formatPrice(wallet.creditReserved)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("role")}</p>
            <p className="mt-1 font-medium capitalize">{role}</p>
          </div>
        </div>

        <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-3 text-sm text-muted">
          {t("walletNote")}
        </p>
      </div>

      <section className="mt-8 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("transactionsTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("transactionsSubtitle")}</p>
        </div>

        <WalletActivityList activities={activities} noTransactions={t("noTransactions")} />

        <Link
          href="/account/wallet-history"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-soft transition hover:text-accent"
        >
          {t("viewFullHistory")}
        </Link>
      </section>
    </div>
  );
}
