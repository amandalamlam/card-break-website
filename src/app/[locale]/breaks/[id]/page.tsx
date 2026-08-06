import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { BreakStatusBadge } from "@/components/breaks/StatusBadge";
import { SlotGridLive } from "@/components/breaks/SlotGridLive";
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

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <BreakStatusBadge status={breakItem.status} />
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{breakItem.title}</h1>
          <p className="text-base leading-7 text-muted">{breakItem.description}</p>
        </div>

        <div className="glass-panel overflow-hidden rounded-3xl">
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

      <section className="mt-12 space-y-6">
        <div>
          <h2 className="text-2xl font-semibold">{t("slotsTitle")}</h2>
          <p className="mt-2 text-sm text-muted">{t("slotsSubtitle")}</p>
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
