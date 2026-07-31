import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { LockErrorCode } from "@/lib/slots/constants";

const messageKeys: Record<LockErrorCode, string> = {
  SLOT_NOT_FOUND: "SLOT_NOT_FOUND",
  BREAK_NOT_ACTIVE: "BREAK_NOT_ACTIVE",
  SLOT_ALREADY_SOLD: "SLOT_ALREADY_SOLD",
  SLOT_LOCKED_BY_OTHER: "SLOT_LOCKED_BY_OTHER",
  SLOT_UNAVAILABLE: "SLOT_UNAVAILABLE",
  UNAUTHORIZED: "UNKNOWN",
  UNKNOWN: "UNKNOWN",
};

type CheckoutLockErrorProps = {
  code: LockErrorCode;
  breakId: string;
};

export async function CheckoutLockError({ code, breakId }: CheckoutLockErrorProps) {
  const t = await getTranslations("checkout.errors");
  const message = t(messageKeys[code] ?? "UNKNOWN");

  return (
    <div className="glass-panel rounded-3xl p-8">
      <h1 className="text-2xl font-semibold text-red-200">{t("title")}</h1>
      <p className="mt-3 text-sm leading-7 text-muted">{message}</p>
      <Link
        href={`/breaks/${breakId}`}
        className="mt-6 inline-flex rounded-xl bg-accent px-5 py-3 text-sm font-semibold text-background transition hover:bg-accent-soft"
      >
        {t("backToBreak")}
      </Link>
    </div>
  );
}
