import { Skeleton } from "@workspace/ui/components/skeleton";

export function ProjectDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div className="rounded-xl border p-6 space-y-4">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  );
}
