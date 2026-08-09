import { Skeleton } from "@/components/ui/skeleton";

export function FeedbackHistorySkeleton() {
  return (
    <div className="space-y-6 min-h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-80" />
        </div>
        <Skeleton className="h-9 w-56" />
      </div>

      {/* Stat tiles */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((index) => (
          <div key={index} className="rounded-lg border border-border p-4 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-14" />
          </div>
        ))}
      </div>

      {/* List rows */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3"
          >
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
