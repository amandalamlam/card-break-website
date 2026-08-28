import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { UpdatePasswordForm } from "@/components/auth/UpdatePasswordForm";
import { getCurrentUser } from "@/lib/auth/session";
import type { AppLocale } from "@/i18n/routing";

type UpdatePasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UpdatePasswordPage({ params }: UpdatePasswordPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/auth/login", locale: locale as AppLocale });
  }

  const t = await getTranslations("auth");

  return (
    <div className="mx-auto px-6 py-12 md:py-16">
      <AuthCard title={t("updatePasswordTitle")} subtitle={t("updatePasswordSubtitle")}>
        <UpdatePasswordForm />
      </AuthCard>
    </div>
  );
}
