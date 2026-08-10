import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isSafeHttpUrl } from "@/lib/shipping/sanitize";

type CompletedBreakBannerProps = {
  breakId: string;
  locale: string;
  isLoggedIn: boolean;
  hasPurchased: boolean;
  videoUrl?: string | null;
};

export async function CompletedBreakBanner({
  breakId,
  locale,
  isLoggedIn,
  hasPurchased,
  videoUrl = null,
}: CompletedBreakBannerProps) {
  const t = await getTranslations("breaks.completedBanner");
  const loginHref = `/auth/login?redirect=/${locale}/breaks/${breakId}`;

  return (
    <div className="rounded-2xl border border-border/80 bg-background/50 px-5 py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-base font-semibold">{t("title")}</p>
          {isLoggedIn ? (
            hasPurchased ? (
              <p className="text-sm text-muted">{t("purchasedHint")}</p>
            ) : (
              <p className="text-sm text-muted">{t("endedText")}</p>
            )
          ) : (
            <p className="text-sm text-muted">{t("guestHint")}</p>
          )}
          {videoUrl && isSafeHttpUrl(videoUrl) ? (
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex pt-1 text-sm text-accent-soft hover:text-accent"
            >
              {t("watchReplay")} →
            </a>
          ) : null}
        </div>

        {isLoggedIn && hasPurchased ? (
          <Link
            href={`/account/shipping/${breakId}`}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("selectShipping")}
          </Link>
        ) : null}

        {!isLoggedIn ? (
          <Link
            href={loginHref}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
          >
            {t("login")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
