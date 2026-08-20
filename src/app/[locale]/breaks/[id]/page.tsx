import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BreakStatusBadge } from "@/components/breaks/StatusBadge";
import { CancelledBreakBanner } from "@/components/breaks/CancelledBreakBanner";
import { CompletedBreakBanner } from "@/components/breaks/CompletedBreakBanner";
import { RichTextContent } from "@/components/breaks/RichTextContent";
import { SlotGridLive } from "@/components/breaks/SlotGridLive";
import { userPurchasedBreak } from "@/lib/breaks/complete";
import { getBreakById } from "@/lib/breaks/queries";
import { getCurrentUser } from "@/lib/auth/session";

export default async function BreakDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const breakItem = await getBreakById(id);
  if (!breakItem) {
    notFound();
  }

  const user = await getCurrentUser();
  const t = await getTranslations("breaks");
  const isCompleted = breakItem.status === "completed";
  const isCancelled = breakItem.status === "cancelled";
  const hasPurchased =
    isCompleted && user ? await userPurchasedBreak(user.id, breakItem.id) : false;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      {isCancelled ? (
        <div className="mb-8">
          <CancelledBreakBanner />
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <BreakStatusBadge status={breakItem.status} />
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{breakItem.title}</h1>
          <RichTextContent html={breakItem.description} />
        </div>

        <div
          className={`glass-panel overflow-hidden rounded-3xl ${
            isCancelled ? "opacity-80 saturate-[0.9]" : ""
          }`}
        >
          {breakItem.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={breakItem.image_url}
              alt={breakItem.title}
              className="aspect-[16/10] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-accent/10 via-transparent to-success/10 text-6xl">
              🃏
            </div>
          )}
        </div>
      </div>

      {isCompleted ? (
        <div className="mt-8">
          <CompletedBreakBanner
            breakId={breakItem.id}
            locale={locale}
            isLoggedIn={Boolean(user)}
            hasPurchased={hasPurchased}
            videoUrl={breakItem.video_url}
          />
        </div>
      ) : null}

      <section className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">{t("slotsTitle")}</h2>
          <p className="mt-2 text-sm text-muted">
            {isCancelled
              ? t("slotsSubtitleCancelled")
              : isCompleted
                ? t("slotsSubtitleCompleted")
                : t("slotsSubtitle")}
          </p>
        </div>
        <SlotGridLive
          breakId={breakItem.id}
          breakStatus={breakItem.status}
          initialSlots={breakItem.break_slots}
          currentUserId={user?.id ?? null}
          locale={locale}
        />
      </section>
    </div>
  );
}
