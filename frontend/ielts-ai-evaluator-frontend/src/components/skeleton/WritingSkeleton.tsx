import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WritingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-64" />
        <Skeleton className="mt-2 h-5 w-96" />
      </div>

      {/* Filter row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-full sm:w-48" />
      </div>

      {/* Topic grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((index) => (
          <Card key={index} className="gap-3 p-5">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
