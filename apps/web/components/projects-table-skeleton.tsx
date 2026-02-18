import { Skeleton } from "@workspace/ui/components/skeleton";

export function ProjectsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-md border">
        <div className="border-b p-2">
          <div className="flex gap-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-60" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
        {["row-1", "row-2", "row-3", "row-4", "row-5"].map((key) => (
          <div key={key} className="flex gap-4 border-b p-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-8" />
            <Skeleton className="h-5 w-60" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
