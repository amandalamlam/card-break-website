import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (user) {
    redirect({ href: "/account", locale: locale as AppLocale });
  }

  const t = await getTranslations("auth");

  return (
    <div className="mx-auto px-6 py-12 md:py-16">
      <AuthCard
        title={t("forgotPasswordTitle")}
        subtitle={t("forgotPasswordSubtitle")}
        footer={
          <p className="text-muted">
            <Link href="/auth/login" className="font-medium text-accent-soft hover:text-accent">
              {t("backToLogin")}
            </Link>
          </p>
        }
      >
        <ForgotPasswordForm />
      </AuthCard>
    </div>
  );
}
