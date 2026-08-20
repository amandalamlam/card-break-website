import { Skeleton } from "@/components/ui/Skeleton";

export function CartPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12 md:py-16">
      <Skeleton className="h-4 w-32" />
      <div className="mt-6 space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="mt-8 space-y-6">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
