"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { createBreakAction, type CreateBreakState } from "./actions";
import type { AppLocale } from "@/i18n/routing";

const initialState: CreateBreakState = {};

type CreateBreakFormProps = {
  locale: AppLocale;
};

export function CreateBreakForm({ locale }: CreateBreakFormProps) {
  const t = useTranslations("admin");
  const [description, setDescription] = useState("");
  const [state, formAction, pending] = useActionState(
    createBreakAction.bind(null, locale),
    initialState
  );

  return (
    <form action={formAction} className="glass-panel space-y-5 rounded-3xl p-8">
      <div className="space-y-2">
        <label htmlFor="title" className="text-sm font-medium">
          {t("titleLabel")}
        </label>
        <input
          id="title"
          name="title"
          required
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none focus:border-accent"
          placeholder="2026 NBA Prizm Hobby Box #02"
        />
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium">{t("descriptionLabel")}</span>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder={t("descriptionPlaceholder")}
        />
        <input type="hidden" name="description" value={description} />
      </div>

      <div className="space-y-2">
        <label htmlFor="image_url" className="text-sm font-medium">
          {t("imageLabel")}
        </label>
        <input
          id="image_url"
          name="image_url"
          type="url"
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm outline-none focus:border-accent"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="slots" className="text-sm font-medium">
          {t("slotsLabel")}
        </label>
        <textarea
          id="slots"
          name="slots"
          required
          rows={8}
          className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 font-mono text-sm outline-none focus:border-accent"
          placeholder={t("slotsPlaceholder")}
          defaultValue={"Lakers,300\nCeltics,300\nWarriors,280"}
        />
        <p className="text-xs text-muted">{t("slotsHint")}</p>
      </div>

      {state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft disabled:opacity-60"
      >
        {pending ? t("submitting") : t("createBreak")}
      </button>
    </form>
  );
}
