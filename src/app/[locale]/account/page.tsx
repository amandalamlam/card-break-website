import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { buildAuthRedirectPath } from "@/lib/auth/redirect";
import { getCurrentProfile } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type AccountPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function AccountPage({ params }: AccountPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const profile = await getCurrentProfile();

  if (!profile) {
    redirect({
      href: buildAuthRedirectPath(locale as AppLocale, `/${locale}/account`, "login"),
      locale: locale as AppLocale,
    });
    throw new Error("Profile missing after auth redirect.");
  }

  const { email, phone, store_credit, role } = profile;
  const t = await getTranslations("account");

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
            <p className="mt-1 text-2xl font-semibold text-accent-soft">
              ${Number(store_credit).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("role")}</p>
            <p className="mt-1 font-medium capitalize">{role}</p>
          </div>
        </div>

        <p className="rounded-2xl border border-dashed border-border/80 bg-background/40 px-4 py-3 text-sm text-muted">
          {t("phaseNote")}
        </p>
      </div>
    </div>
  );
}
