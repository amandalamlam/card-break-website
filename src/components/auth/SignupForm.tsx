"use client";

import { FormEvent, useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { formatPhoneHintExamples, isValidInternationalPhone, normalizePhone } from "@/lib/validation/phone";
import { stripLocalePrefix } from "@/lib/auth/redirect";

type SignupFormProps = {
  redirectTo: string;
};

export function SignupForm({ redirectTo }: SignupFormProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const normalizedPhone = normalizePhone(phone.trim());
    if (!isValidInternationalPhone(normalizedPhone)) {
      setError(t("phoneInvalid"));
      return;
    }

    setLoading(true);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const callbackUrl = new URL("/auth/callback", appUrl);
    callbackUrl.searchParams.set("redirect", redirectTo);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { phone: normalizedPhone },
        emailRedirectTo: callbackUrl.toString(),
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push(stripLocalePrefix(redirectTo));
      router.refresh();
      return;
    }

    setSuccess(t("confirmEmail"));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="signup-email" className="text-sm font-medium">
          {t("email")}
        </label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="phone" className="text-sm font-medium">
          {t("phone")}
        </label>
        <input
          id="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder={formatPhoneHintExamples()}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
        <p className="text-xs text-muted">{t("phoneHint")}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="text-sm font-medium">
          {t("password")}
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
        <p className="text-xs text-muted">{t("passwordHint")}</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? t("submitting") : t("signupSubmit")}
      </button>
    </form>
  );
}
