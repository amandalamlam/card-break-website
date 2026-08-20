import { Skeleton } from "@/components/ui/Skeleton";

export function WalletHistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="glass-panel space-y-2 rounded-2xl p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-5 w-full max-w-sm" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}
