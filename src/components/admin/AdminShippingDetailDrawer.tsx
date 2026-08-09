"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  formatAdminShippingDate,
  getAdminShippingDisplayStatus,
  ADMIN_SHIPPING_STATUS_BADGE_CLASS,
} from "@/lib/shipping/admin-display";
import { isSafeHttpUrl } from "@/lib/shipping/sanitize";
import type { AdminShippingParticipantRow, ShippingRequestStatus } from "@/lib/shipping/types";

type AdminShippingDetailDrawerProps = {
  open: boolean;
  onClose: () => void;
  participant: AdminShippingParticipantRow | null;
  breakTitle: string;
  videoUrl: string | null;
  locale: string;
};

export function AdminShippingDetailDrawer({
  open,
  onClose,
  participant,
  breakTitle,
  videoUrl,
  locale,
}: AdminShippingDetailDrawerProps) {
  const t = useTranslations("admin.shipping");
  const router = useRouter();
  const request = participant?.shippingRequest ?? null;
  const canEdit = request !== null;

  const [isEditing, setIsEditing] = useState(false);
  const [optionName, setOptionName] = useState("");
  const [shippingDetails, setShippingDetails] = useState("");
  const [status, setStatus] = useState<ShippingRequestStatus>("pending");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !participant) {
      return;
    }

    setIsEditing(false);
    setMessage(null);
    setError(null);
    setOptionName(request?.option_name ?? "");
    setShippingDetails(request?.shipping_details ?? "");
    setStatus(request?.status ?? "pending");
    setAdminNotes(request?.admin_notes ?? "");
  }, [open, participant, request]);

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

  if (!open || !participant) {
    return null;
  }

  const displayStatus = getAdminShippingDisplayStatus(request);

  async function handleSave() {
    if (!request) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/shipping/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: request.id,
          optionName,
          shippingDetails,
          status,
          adminNotes: adminNotes || null,
        }),
      });

      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        setError(t("saveError"));
        setLoading(false);
        return;
      }

      setMessage(t("saveSuccess"));
      setIsEditing(false);
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <button
        type="button"
        aria-label={t("drawer.close")}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
          <div className="min-w-0 space-y-1">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">{breakTitle}</p>
            <h2 className="truncate text-lg font-semibold">{t("drawer.title")}</h2>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => {
                setIsEditing((current) => !current);
                setMessage(null);
                setError(null);
              }}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted transition hover:text-foreground"
            >
              {isEditing ? t("drawer.cancelEdit") : t("drawer.edit")}
            </button>
          ) : null}
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <section className="space-y-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("userLabel")}</p>
              <p className="mt-1 font-medium">{participant.email}</p>
              <p className="text-muted">{participant.phone}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("slotsLabel")}</p>
              <p className="mt-1 font-medium">{participant.slotNames}</p>
            </div>

            {videoUrl && isSafeHttpUrl(videoUrl) ? (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex text-sm text-accent-soft hover:text-accent"
              >
                {t("watchReplay")} →
              </a>
            ) : null}
          </section>

          {canEdit && isEditing ? (
            <section className="space-y-4 border-t border-border/70 pt-5">
              <label className="block space-y-1 text-sm">
                <span className="text-muted">{t("optionLabel")}</span>
                <input
                  value={optionName}
                  onChange={(event) => setOptionName(event.target.value)}
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-muted">{t("statusLabel")}</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as ShippingRequestStatus)}
                  className="form-select w-full rounded-xl border border-border bg-background/50 px-3 py-2"
                >
                  <option value="pending">{t("status.pending")}</option>
                  <option value="shipped">{t("status.shipped")}</option>
                  <option value="completed">{t("status.completed")}</option>
                </select>
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-muted">{t("detailsLabel")}</span>
                <textarea
                  value={shippingDetails}
                  onChange={(event) => setShippingDetails(event.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
                />
              </label>

              <label className="block space-y-1 text-sm">
                <span className="text-muted">{t("adminNotesLabel")}</span>
                <textarea
                  value={adminNotes}
                  onChange={(event) => setAdminNotes(event.target.value)}
                  rows={4}
                  placeholder={t("drawer.trackingPlaceholder")}
                  className="w-full rounded-xl border border-border bg-background/50 px-3 py-2"
                />
              </label>
            </section>
          ) : (
            <section className="space-y-4 border-t border-border/70 pt-5 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("statusLabel")}</p>
                <span
                  className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${ADMIN_SHIPPING_STATUS_BADGE_CLASS[displayStatus]}`}
                >
                  {t(`displayStatus.${displayStatus}`)}
                </span>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("optionLabel")}</p>
                <p className="mt-1 font-medium">{request?.option_name ?? t("drawer.notSubmitted")}</p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("detailsLabel")}</p>
                <p className="mt-1 whitespace-pre-wrap font-medium">
                  {request?.shipping_details ?? "—"}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted">{t("adminNotesLabel")}</p>
                <p className="mt-1 whitespace-pre-wrap text-muted">
                  {request?.admin_notes?.trim() ? request.admin_notes : t("drawer.noAdminNotes")}
                </p>
              </div>

              {request ? (
                <p className="text-xs text-muted">
                  {t("drawer.submittedAt", {
                    date: formatAdminShippingDate(request.created_at, locale),
                  })}
                </p>
              ) : (
                <p className="rounded-xl border border-dashed border-border/80 bg-background/40 px-3 py-3 text-muted">
                  {t("drawer.unrequestedNote")}
                </p>
              )}
            </section>
          )}
        </div>

        <footer className="space-y-2 border-t border-border/70 px-5 py-4">
          {canEdit && isEditing ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:opacity-60"
            >
              {loading ? t("saving") : t("save")}
            </button>
          ) : null}

          {message ? <p className="text-xs text-success">{message}</p> : null}
          {error ? <p className="text-xs text-red-300">{error}</p> : null}
        </footer>
      </aside>
    </div>
  );
}
