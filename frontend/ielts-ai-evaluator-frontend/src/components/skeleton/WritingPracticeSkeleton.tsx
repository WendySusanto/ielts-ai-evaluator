import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function WritingPracticeSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-6 w-96" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Writing Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Description Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border-l-4">
                <Skeleton className="h-5 w-full mb-4" />
                <Skeleton className="h-4 w-4/5" />
              </div>

              {/* Chart Placeholder Skeleton */}
              <div className="mt-4 p-8 rounded-lg border-2 border-dashed">
                <div className="text-center">
                  <Skeleton className="h-16 w-16 mx-auto mb-4 rounded-full" />
                  <Skeleton className="h-6 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-64 mx-auto" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Writing Area Card Skeleton */}
          <Card>
            <CardHeader className="flex-row justify-between items-center">
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-8 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Word Count Progress Skeleton */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-4 w-72" />
              </div>

              {/* Textarea Skeleton */}
              <Skeleton className="h-[400px] w-full" />

              {/* Buttons Skeleton */}
              <div className="flex justify-between items-center">
                <Skeleton className="h-9 w-24" />
                <Skeleton className="h-9 w-32" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Writing Tips Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[1, 2, 3, 4].map((index) => (
                <div key={index} className="p-3 rounded-lg">
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Sample Phrases Card Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((section) => (
                <div key={section} className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-40" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
