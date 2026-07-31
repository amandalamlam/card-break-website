import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";
import { getSafeRedirect, stripLocalePrefix } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type SignupPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ redirect?: string }>;
};

export default async function SignupPage({ params, searchParams }: SignupPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { redirect: redirectParam } = await searchParams;
  const redirectTo = getSafeRedirect(redirectParam, locale as AppLocale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: stripLocalePrefix(redirectTo), locale: locale as AppLocale });
  }

  const t = await getTranslations("auth");
  const loginHref = `/auth/login?redirect=${encodeURIComponent(redirectTo)}`;

  return (
    <div className="mx-auto px-6 py-12 md:py-16">
      <AuthCard
        title={t("signupTitle")}
        subtitle={t("signupSubtitle")}
        footer={
          <p className="text-muted">
            {t("hasAccount")}{" "}
            <Link href={loginHref} className="font-medium text-accent-soft hover:text-accent">
              {t("loginLink")}
            </Link>
          </p>
        }
      >
        <SignupForm redirectTo={redirectTo} />
      </AuthCard>
    </div>
  );
}
