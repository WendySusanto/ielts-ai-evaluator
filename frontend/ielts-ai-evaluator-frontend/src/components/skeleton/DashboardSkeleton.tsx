import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const DashboardSkeleton = () => {
  return (
    <div
      className="space-y-6 min-h-full"
      role="status"
      aria-busy="true"
      aria-label="Loading your dashboard"
    >
      <span className="sr-only">Loading your dashboard…</span>

      {/* Progress hero skeleton */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="w-full space-y-4 md:max-w-xl">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-5 w-full max-w-md" />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="flex w-full flex-col gap-3 md:w-56 md:shrink-0">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Band trend skeleton */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52 w-full rounded-xl" />
        </CardContent>
      </Card>

      {/* Recent evaluations skeleton */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
