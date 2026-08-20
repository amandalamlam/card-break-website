import { Skeleton } from "@/components/ui/Skeleton";

export function BreakDetailSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-10 w-full max-w-xl" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
      </div>
      <section className="mt-12 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-44 w-full rounded-2xl" />
          ))}
        </div>
      </section>
    </div>
  );
}
