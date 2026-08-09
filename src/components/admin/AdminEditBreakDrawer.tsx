"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { BreakStatusBadgeClient } from "@/components/breaks/BreakStatusBadgeClient";
import { formatSlotsInput } from "@/lib/breaks/slots-input";
import type { AdminBreakDetail } from "@/lib/breaks/types";

type AdminEditBreakDrawerProps = {
  open: boolean;
  onClose: () => void;
  breakItem: AdminBreakDetail | null;
};

export function AdminEditBreakDrawer({ open, onClose, breakItem }: AdminEditBreakDrawerProps) {
  const t = useTranslations("admin");
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [slotsRaw, setSlotsRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !breakItem) {
      return;
    }

    setTitle(breakItem.title);
    setDescription(breakItem.description);
    setImageUrl(breakItem.image_url ?? "");
    setVideoUrl(breakItem.video_url ?? "");
    setSlotsRaw(formatSlotsInput(breakItem.break_slots));
    setMessage(null);
    setError(null);
  }, [open, breakItem]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open || !breakItem) {
    return null;
  }

  async function handleSave() {
    if (!breakItem) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/breaks/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          breakId: breakItem.id,
          title,
          description,
          imageUrl: imageUrl || null,
          videoUrl: videoUrl || null,
          slotsRaw,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || !data.ok) {
        setError(data.message ?? t("editBreak.saveError"));
        setLoading(false);
        return;
      }

      setMessage(t("editBreak.saveSuccess"));
      router.refresh();
    } catch {
      setError(t("editBreak.saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label={t("editBreak.close")}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-2xl flex-col border-l border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-6 py-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{t("editBreak.title")}</h2>
              <BreakStatusBadgeClient status={breakItem.status} />
            </div>
            <p className="text-sm text-muted">{t("editBreak.subtitle")}</p>
          </div>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("titleLabel")}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
            />
          </label>

          <div className="space-y-1 text-sm">
            <span className="text-muted">{t("descriptionLabel")}</span>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder={t("descriptionPlaceholder")}
            />
          </div>

          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("imageLabel")}</span>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              type="url"
              className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
              placeholder="https://..."
            />
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("editBreak.videoLabel")}</span>
            <input
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              type="url"
              className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
              placeholder="https://..."
            />
            <p className="text-xs text-muted">{t("editBreak.videoHint")}</p>
          </label>

          <label className="block space-y-1 text-sm">
            <span className="text-muted">{t("slotsLabel")}</span>
            <textarea
              value={slotsRaw}
              onChange={(event) => setSlotsRaw(event.target.value)}
              rows={10}
              className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 font-mono text-sm"
            />
            <p className="text-xs text-muted">{t("editBreak.slotsHint")}</p>
          </label>

          <div className="rounded-xl border border-border/70 bg-background/40 px-4 py-3 text-sm text-muted">
            {t("slotsSummary", {
              available: breakItem.available_count,
              total: breakItem.total_count,
            })}
          </div>
        </div>

        <footer className="space-y-2 border-t border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:opacity-60"
          >
            {loading ? t("editBreak.saving") : t("editBreak.save")}
          </button>

          {message ? <p className="text-xs text-success">{message}</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </footer>
      </aside>
    </div>
  );
}
