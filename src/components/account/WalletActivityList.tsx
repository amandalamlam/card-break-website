import { formatPrice } from "@/lib/breaks/format";
import type { WalletActivityViewModel } from "@/lib/wallet/display";

type WalletActivityListProps = {
  activities: WalletActivityViewModel[];
  noTransactions: string;
};

export function WalletActivityList({ activities, noTransactions }: WalletActivityListProps) {
  if (activities.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
        {noTransactions}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => (
        <article key={activity.id} className="glass-panel space-y-1 rounded-2xl px-4 py-3 text-sm">
          <div className="flex items-start justify-between gap-4">
            <p className="font-medium leading-6">{activity.typeLabel}</p>
            <p
              className={`shrink-0 font-semibold ${
                activity.amount.isCredit ? "text-success" : "text-accent-soft"
              }`}
            >
              {activity.amount.sign}
              {formatPrice(activity.amount.value)}
            </p>
          </div>

          {activity.itemDetails ? (
            <p className="whitespace-pre-line leading-6 text-foreground/90">{activity.itemDetails}</p>
          ) : null}

          <p className="text-xs leading-5 text-muted">{activity.metadata}</p>
        </article>
      ))}
    </div>
  );
}
