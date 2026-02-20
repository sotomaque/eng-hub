import { Skeleton } from "@workspace/ui/components/skeleton";

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-transparent bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="size-8 rounded-xl" />
        <Skeleton className="size-4 rounded" />
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-14" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
