"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ShippingOption } from "@/lib/shipping/types";

type AdminShippingOptionsPanelProps = {
  options: ShippingOption[];
};

export function AdminShippingOptionsPanel({ options }: AdminShippingOptionsPanelProps) {
  const t = useTranslations("admin.shippingOptions");
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");

  async function toggleOption(option: ShippingOption) {
    setLoadingId(option.id);
    setMessage(null);

    try {
      const response = await fetch("/api/admin/shipping/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: option.id,
          name: option.name,
          instructions: option.instructions,
          isActive: !option.is_active,
        }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setMessage(t("saveError"));
        return;
      }

      router.refresh();
    } catch {
      setMessage(t("saveError"));
    } finally {
      setLoadingId(null);
    }
  }

  async function createOption() {
    if (!newName.trim()) {
      return;
    }

    setLoadingId("new");
    setMessage(null);

    try {
      const response = await fetch("/api/admin/shipping/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          instructions: newInstructions,
          isActive: true,
        }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        setMessage(t("saveError"));
        return;
      }

      setNewName("");
      setNewInstructions("");
      router.refresh();
    } catch {
      setMessage(t("saveError"));
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {options.map((option) => (
        <article
          key={option.id}
          className="rounded-2xl border border-border bg-background/50 p-4 text-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{option.name}</p>
              <p className="mt-1 text-muted">{option.instructions}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleOption(option)}
              disabled={loadingId === option.id}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                option.is_active
                  ? "bg-success/15 text-success"
                  : "border border-border text-muted"
              }`}
            >
              {loadingId === option.id
                ? t("saving")
                : option.is_active
                  ? t("active")
                  : t("inactive")}
            </button>
          </div>
        </article>
      ))}

      <div className="rounded-2xl border border-dashed border-border p-4">
        <p className="text-sm font-semibold">{t("addTitle")}</p>
        <div className="mt-3 space-y-3">
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
          />
          <textarea
            value={newInstructions}
            onChange={(event) => setNewInstructions(event.target.value)}
            placeholder={t("instructionsPlaceholder")}
            rows={3}
            className="w-full rounded-xl border border-border bg-background/50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={createOption}
            disabled={loadingId === "new"}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background"
          >
            {loadingId === "new" ? t("saving") : t("addButton")}
          </button>
        </div>
      </div>

      {message ? <p className="text-xs text-red-300">{message}</p> : null}
    </div>
  );
}
