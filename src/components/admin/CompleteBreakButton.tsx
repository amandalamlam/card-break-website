"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type CompleteBreakButtonProps = {
  breakId: string;
  breakTitle: string;
  existingVideoUrl?: string | null;
};

export function CompleteBreakButton({
  breakId,
  breakTitle,
  existingVideoUrl = null,
}: CompleteBreakButtonProps) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setVideoUrl(existingVideoUrl ?? "");
      setError(null);
    }
  }, [open, existingVideoUrl]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  async function handleConfirm() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/breaks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ breakId, videoUrl }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        const errorCode = data.error ?? "UNKNOWN";
        const errorKey = `completeBreak.errors.${errorCode}`;
        const translated = t(errorKey);
        setError(translated === errorKey ? t("completeBreak.error") : translated);
        setLoading(false);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError(t("completeBreak.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-400 hover:text-emerald-100"
      >
        {t("completeBreak.action")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label={t("completeBreak.close")}
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-6 shadow-2xl">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">{t("completeBreak.title")}</h3>
              <p className="text-sm text-muted">
                {t("completeBreak.confirm", { title: breakTitle })}
              </p>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-muted">{t("completeBreak.videoLabel")}</span>
              <input
                type="url"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
              />
              <p className="text-xs text-muted">{t("completeBreak.videoHint")}</p>
            </label>

            {error ? <p className="text-xs text-red-300">{error}</p> : null}

            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm text-muted transition hover:text-foreground"
              >
                {t("completeBreak.cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading || !videoUrl.trim()}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
              >
                {loading ? t("completeBreak.saving") : t("completeBreak.confirmAction")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
