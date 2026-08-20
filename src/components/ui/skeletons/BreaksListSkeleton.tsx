import { Skeleton } from "@/components/ui/Skeleton";

export function BreaksListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-12 md:py-16">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-full max-w-2xl" />
      </div>
      <Skeleton className="mb-6 h-12 w-full max-w-md rounded-2xl" />
      <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-full rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
