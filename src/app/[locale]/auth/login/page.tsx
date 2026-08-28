import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthEntryRedirect } from "@/components/auth/AuthEntryRedirect";
import { LoginForm } from "@/components/auth/LoginForm";
import { getSafeRedirect } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string; error?: string }>;
};

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { redirect: redirectParam, error } = await searchParams;
  const redirectTo = getSafeRedirect(redirectParam, locale as AppLocale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/", locale: locale as AppLocale });
  }

  const t = await getTranslations("auth");
  const signupHref = `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="mx-auto px-6 py-12 md:py-16">
      <AuthCard
        title={t("loginTitle")}
        subtitle={t("loginSubtitle")}
        footer={
          <p className="text-muted">
            {t("noAccount")}{" "}
            <Link href={signupHref} className="font-medium text-accent-soft hover:text-accent">
              {t("signupLink")}
            </Link>
          </p>
        }
      >
        {error === "auth_callback_failed" ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {t("callbackError")}
          </p>
        ) : null}
        <AuthEntryRedirect />
        <LoginForm redirectTo={redirectTo} />
      </AuthCard>
    </div>
  );
}
