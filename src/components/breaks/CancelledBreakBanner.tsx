import { getTranslations } from "next-intl/server";

export async function CancelledBreakBanner() {
  const t = await getTranslations("breaks.cancelledBanner");

  return (
    <div className="rounded-2xl border border-slate-600/50 bg-slate-900/40 px-5 py-5">
      <div className="space-y-2">
        <p className="text-base font-semibold text-slate-100">{t("title")}</p>
        <p className="text-sm leading-6 text-slate-300">{t("body")}</p>
      </div>
    </div>
  );
}
