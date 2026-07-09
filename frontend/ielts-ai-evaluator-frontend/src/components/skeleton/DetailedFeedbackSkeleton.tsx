import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DetailedFeedbackSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-32" /> {/* Back button */}
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" /> {/* Title */}
            <Skeleton className="h-5 w-64" /> {/* Subtitle */}
          </div>
        </div>
        <Skeleton className="h-10 w-24" /> {/* Overall band badge */}
      </div>

      {/* Filter Controls Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-96" />
        </CardHeader>
        <CardContent>
          <div className="grid w-full grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overall Score Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((index) => (
              <div key={index} className="text-center space-y-2">
                <Skeleton className="h-4 w-24 mx-auto" />
                <Skeleton className="h-8 w-12 mx-auto" />
                <Skeleton className="h-2 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Essay with Highlights Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6 space-y-3">
            {/* Simulate essay paragraphs */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-4/5" />
            <div className="pt-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-2" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Criteria Breakdown Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((cardIndex) => (
          <Card key={cardIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sub-scores skeleton */}
              <div className="space-y-3">
                {[1, 2, 3].map((subIndex) => (
                  <div key={subIndex} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-1 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                ))}
              </div>

              {/* Issues skeleton */}
              <div className="mt-4 pt-4 border-t border-border">
                <Skeleton className="h-4 w-32 mb-3" />
                <div className="space-y-2">
                  {[1, 2].map((issueIndex) => (
                    <div key={issueIndex} className="border rounded-lg p-3">
                      <Skeleton className="h-4 w-3/4 mb-1" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Action Buttons Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-center">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-32" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
