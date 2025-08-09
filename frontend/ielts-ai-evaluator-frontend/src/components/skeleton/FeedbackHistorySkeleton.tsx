import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function FeedbackHistorySkeleton() {
  return (
    <div className="p-6 space-y-6 min-h-full animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
      </div>

      {/* Stats Dashboard Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-8 w-12 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-between rounded-lg p-6 space-x-4">
            {[1, 2, 3, 4, 5].map((index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-2 flex-1"
              >
                <Skeleton className="h-4 w-12" />
                <Skeleton
                  className="w-8 rounded-t-lg"
                  style={{ height: `${Math.random() * 150 + 50}px` }}
                />
                <Skeleton className="h-3 w-6" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Session History Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          {/* Tabs Skeleton */}
          <div className="grid w-full grid-cols-3 gap-2 mb-6">
            {[1, 2, 3].map((index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>

          {/* Session Items Skeleton */}
          <div className="space-y-4">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="border rounded-lg p-6 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((scoreIndex) => (
                    <div key={scoreIndex} className="text-center space-y-1">
                      <Skeleton className="h-3 w-20 mx-auto" />
                      <Skeleton className="h-5 w-8 mx-auto" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>

                {/* Feedback */}
                <div className="rounded-lg p-4 border space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-24" />
                  <Skeleton className="h-8 w-28" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
