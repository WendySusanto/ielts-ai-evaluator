import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SpeakingFeedbackSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-9 w-20" /> {/* Back button */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" /> {/* Part · topic */}
            <Skeleton className="h-8 w-56" /> {/* h1 */}
          </div>
        </div>
        <div className="text-right space-y-2">
          <Skeleton className="h-12 w-16 ml-auto" /> {/* Band score */}
          <Skeleton className="h-4 w-24 ml-auto" />
          <Skeleton className="h-3 w-28 ml-auto" />
        </div>
      </div>

      {/* Summary Skeleton */}
      <Card className="bg-secondary border-border">
        <CardContent className="pt-6 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>

      {/* Criteria breakdown Skeleton (3 Gemini criteria + pronunciation slot) */}
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((cardIndex) => (
          <Card key={cardIndex}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-10" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Transcript Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col items-start">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-10 w-2/3 rounded-2xl" />
          </div>
          <div className="flex flex-col items-end">
            <Skeleton className="h-3 w-10 mb-1" />
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
          </div>
          <div className="flex flex-col items-start">
            <Skeleton className="h-3 w-16 mb-1" />
            <Skeleton className="h-10 w-3/4 rounded-2xl" />
          </div>
        </CardContent>
      </Card>

      {/* Footer actions Skeleton */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}
