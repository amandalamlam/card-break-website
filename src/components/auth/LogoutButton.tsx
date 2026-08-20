"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { Spinner } from "@/components/ui/Spinner";

type LogoutButtonProps = {
  variant?: "default" | "drawer";
  className?: string;
  icon?: ReactNode;
};

export function LogoutButton({
  variant = "default",
  className = "",
  icon,
}: LogoutButtonProps) {
  const t = useTranslations("auth");
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const baseClassName =
    variant === "drawer"
      ? "inline-flex items-center gap-2 rounded-xl text-sm font-medium text-rose-400 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-60"
      : "rounded-lg border border-border px-3 py-2 text-sm text-muted transition hover:text-foreground disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className={`${baseClassName} ${className}`.trim()}
    >
      {loading ? <Spinner className="mr-2 h-4 w-4 shrink-0" /> : icon}
      {loading ? t("submitting") : t("logout")}
    </button>
  );
}
