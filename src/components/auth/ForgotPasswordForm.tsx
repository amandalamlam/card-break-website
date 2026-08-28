"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/ToastProvider";
import type { AppLocale } from "@/i18n/routing";

export function ForgotPasswordForm() {
  const t = useTranslations("auth");
  const locale = useLocale() as AppLocale;
  const supabase = createClient();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", appUrl);
    callbackUrl.searchParams.set("next", `/${locale}/auth/update-password`);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: callbackUrl.toString(),
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    showToast(t("resetEmailSent"));
    setEmail("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="forgot-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("submitting") : t("sendResetLink")}
      </button>
    </form>
  );
}
