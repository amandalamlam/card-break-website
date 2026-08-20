import { Skeleton } from "@/components/ui/Skeleton";

export function AccountPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <Skeleton className="mx-auto mb-6 h-12 w-full max-w-md rounded-2xl" />
      <div className="glass-panel space-y-6 rounded-3xl p-8">
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-full" />
            </div>
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    </div>
  );
}
