import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { WithdrawalForm } from "@/components/account/WithdrawalForm";
import { WithdrawalHistory } from "@/components/account/WithdrawalHistory";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth/session";
import { formatPrice } from "@/lib/breaks/format";
import { parseWalletBalance } from "@/lib/wallet/types";
import { getUserWithdrawals } from "@/lib/wallet/withdrawal-actions";
import type { AppLocale } from "@/i18n/routing";

type WithdrawPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountWithdrawPage({ params }: WithdrawPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  const profile = await getCurrentProfile();

  if (!user || !profile) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account/withdraw`, "login"),
      locale: locale as AppLocale,
    });
    throw new Error("Profile missing after auth redirect.");
  }

  const wallet = parseWalletBalance(profile);
  const withdrawals = await getUserWithdrawals(user.id, 20);
  const t = await getTranslations("account.withdrawals");

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <Link
        href="/account"
        className="inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
      >
        {t("backToAccount")}
      </Link>

      <div className="mt-6 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t("pageTitle")}</h1>
        <p className="text-muted">{t("subtitle")}</p>
      </div>

      <div className="glass-panel mt-8 space-y-4 rounded-3xl p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("availableBalance")}</p>
          <p className="text-2xl font-semibold text-accent-soft">
            {formatPrice(wallet.availableCredit)}
          </p>
        </div>

        <WithdrawalForm availableCredit={wallet.availableCredit} />
      </div>

      <section className="mt-10 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{t("historyTitle")}</h2>
          <p className="mt-1 text-sm text-muted">{t("historySubtitle")}</p>
        </div>

        <WithdrawalHistory
          withdrawals={withdrawals}
          locale={locale}
          noWithdrawals={t("noWithdrawals")}
        />
      </section>
    </div>
  );
}
