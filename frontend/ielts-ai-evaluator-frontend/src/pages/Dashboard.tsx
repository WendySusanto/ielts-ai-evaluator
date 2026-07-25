import { DashboardSkeleton } from "@/components/skeleton/DashboardSkeleton";
import { BandTrendCard } from "@/components/dashboard/BandTrendCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/hooks/use-api";
import { friendlyError } from "@/lib/friendly-error";
import { getRelativeTime } from "@/lib/utils";
import { DashboardData } from "@/types/dashboard";
import type { User } from "@/types/User";
import { BookOpen, Clock, Mic, PenTool } from "lucide-react";
import { Link, useNavigate } from "react-router";
import ErrorPage from "./ErrorPage";

const Dashboard = () => {
  // Fetch dashboard stats + the profile fields the greeting/progress hero needs.
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
  } = useApi<DashboardData>("/api/dashboard");

  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile,
  } = useApi<User>("/api/me");

  const navigate = useNavigate();

  if (isLoading || isLoadingProfile) {
    return <DashboardSkeleton />;
  }

  if (error || profileError) {
    return (
      <ErrorPage
        title="Failed to load dashboard"
        message={friendlyError((error ?? profileError)!)}
        onRetry={() => {
          refetch();
          refetchProfile();
        }}
      />
    );
  }

  if (!dashboardData || !profile) {
    return null;
  }

  const { writingCount, speakingCount, averageBand, recentItems } = dashboardData;
  const targetScore = profile.ieltsTargetScore;
  const name = profile.fullName || "Student";
  const totalEvals = writingCount + speakingCount;

  // The one thing the hero answers: where am I versus my target, and what next.
  const progressPct =
    averageBand != null && targetScore != null
      ? Math.min((averageBand / targetScore) * 100, 100)
      : null;

  const progressLine = () => {
    if (totalEvals === 0) {
      return "Ready to start? Complete your first practice and your band score will appear here.";
    }
    if (averageBand == null) {
      return "You've started practicing — your average band will appear once your evaluations are scored.";
    }
    if (targetScore == null) {
      return null; // handled with an inline link below
    }
    if (averageBand >= targetScore) {
      return `You're averaging ${averageBand.toFixed(1)} — you've reached your target of ${targetScore}. Keep it up!`;
    }
    const gap = (targetScore - averageBand).toFixed(1);
    return `You're averaging ${averageBand.toFixed(1)}, targeting ${targetScore}. ${gap} band to go.`;
  };

  return (
    <div className="space-y-6 min-h-full">
      {/* Progress hero — greeting + band-vs-target + the primary next action */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4 md:max-w-xl">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground text-balance break-words">
                Welcome back, {name}
              </h1>

              {averageBand != null && totalEvals > 0 && targetScore == null ? (
                <p className="text-foreground/80">
                  You're averaging {averageBand.toFixed(1)}.{" "}
                  <Link
                    to="/profile"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Set a target score
                  </Link>{" "}
                  to track your progress.
                </p>
              ) : (
                <p className="text-foreground/80">{progressLine()}</p>
              )}

              {progressPct != null && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-card-foreground">
                      Current average
                    </span>
                    <span className="text-muted-foreground">
                      {averageBand!.toFixed(1)} / {targetScore}
                    </span>
                  </div>
                  <Progress value={progressPct} className="h-2" />
                </div>
              )}

              {totalEvals > 0 && (
                <p className="text-sm text-muted-foreground">
                  {writingCount} writing · {speakingCount} speaking evaluations
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 md:w-56 md:shrink-0">
              <Button onClick={() => navigate("/writing")}>
                <PenTool className="h-4 w-4 mr-2" />
                Start Writing Practice
              </Button>
              <Button variant="outline" onClick={() => navigate("/speaking")}>
                <Mic className="h-4 w-4 mr-2" />
                Practice Speaking
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress over time */}
      <BandTrendCard
        points={dashboardData.bandTrend}
        targetScore={targetScore ?? null}
      />

      {/* Recent activity */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle asChild>
            <h2 className="flex items-center gap-2 text-card-foreground">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Recent Evaluations
            </h2>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {recentItems.length > 0 ? (
            recentItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left flex items-center justify-between p-4 rounded-xl bg-muted border border-border hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                onClick={() =>
                  navigate(
                    item.type === "speaking"
                      ? `/speaking-feedback/${item.id}`
                      : `/feedback/${item.id}`,
                  )
                }
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div
                    className={`shrink-0 p-2 rounded-lg ${
                      item.type === "speaking"
                        ? "bg-tip/10 text-tip"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {item.type === "speaking" ? (
                      <Mic className="h-4 w-4" />
                    ) : (
                      <PenTool className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-card-foreground truncate">
                      {item.type === "speaking"
                        ? `Speaking ${
                            item.taskType === "Part1"
                              ? "Part 1"
                              : item.taskType === "Part2"
                                ? "Part 2"
                                : "Part 3"
                          }`
                        : item.taskType === "Task1"
                          ? "Writing Task 1"
                          : "Writing Task 2"}
                    </p>
                    <p className="text-sm text-foreground font-medium truncate">
                      {item.topic}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <Badge variant="secondary" className="mb-1">
                    {item.overallBand.toFixed(1)}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {getRelativeTime(item.createdAt)}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium">
                No evaluations yet. Start your first practice!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
