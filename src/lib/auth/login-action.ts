"use server";

import { redirect } from "@/i18n/navigation";
import { stripLocalePrefix } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";

export type LoginActionResult = { ok: false; error: string };

export async function loginWithPassword(
  locale: AppLocale,
  redirectTo: string,
  email: string,
  password: string
): Promise<LoginActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  redirect({ href: stripLocalePrefix(redirectTo), locale });

  return { ok: false, error: "Redirect failed" };
}
