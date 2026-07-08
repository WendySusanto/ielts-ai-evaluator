import { DashboardSkeleton } from "@/components/skeleton/DashboardSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/hooks/use-api";
import { DashboardData } from "@/types/dashboard";
import type { User } from "@/types/User";
import {
  BarChart3,
  BookOpen,
  Clock,
  Mic,
  PenTool,
  Star,
  Target,
  User as UserIcon,
} from "lucide-react";
import { useNavigate } from "react-router";
import ErrorPage from "./ErrorPage";

const Dashboard = () => {
  // Fetch dashboard stats + the profile fields the "welcome"/profile card needs.
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

  // Calculate days since member joined
  const getDaysSinceMember = (memberSince: string) => {
    const memberDate = new Date(memberSince);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - memberDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Format date to relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (isLoading || isLoadingProfile) {
    return <DashboardSkeleton />;
  }

  if (error || profileError) {
    return (
      <ErrorPage
        title="Failed to load dashboard"
        message={(error ?? profileError)!.message}
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
  const lastWriting = recentItems.find((i) => i.type === "writing");

  // Dynamic stats based on API data
  const stats = [
    {
      title: "Total Evaluations",
      value: (writingCount + speakingCount).toString(),
      change: averageBand != null ? `Average: ${averageBand.toFixed(1)}` : "No evaluations yet",
      icon: BookOpen,
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      title: "Writing Tasks",
      value: writingCount.toString(),
      change: lastWriting
        ? `Last: ${getRelativeTime(lastWriting.createdAt)}`
        : "No recent activity",
      icon: PenTool,
      color: "text-green-600 dark:text-green-400",
    },
    {
      title: "Speaking Tasks",
      value: speakingCount.toString(),
      change: targetScore != null ? `Target: ${targetScore}` : "No target set",
      icon: Mic,
      color: "text-purple-600 dark:text-purple-400",
    },
    {
      title: "Average Band",
      value: averageBand != null ? averageBand.toFixed(1) : "N/A",
      change: "Across all evaluations",
      icon: Target,
      color: "text-orange-600 dark:text-orange-400",
    },
  ];

  return (
    <div className="space-y-6 min-h-full">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Welcome back, {profile.fullName || "Student"}!
        </h1>
        <p className="text-foreground font-medium text-lg">
          {targetScore != null ? (
            <>
              Ready to continue your IELTS journey? You're targeting a{" "}
              <span className="font-semibold text-card-foreground">
                {targetScore}
              </span>{" "}
              band score.
            </>
          ) : (
            "Ready to continue your IELTS journey?"
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <Card
            key={index}
            className="border-0 shadow-lg bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300"
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-card-foreground">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stat.change}
                  </p>
                </div>
                <div
                  className={`p-3 rounded-full bg-muted dark:bg-muted/50 ${stat.color}`}
                >
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm h-[500px]">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Clock className="h-5 w-5 text-secondary" />
                Recent Evaluations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentItems.length > 0 ? (
                recentItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-muted border border-border cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() =>
                      navigate(
                        item.type === "speaking"
                          ? `/speaking-feedback/${item.id}`
                          : `/feedback/${item.id}`,
                      )
                    }
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${
                          item.type === "speaking"
                            ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            : "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {item.type === "speaking" ? (
                          <Mic className="h-4 w-4" />
                        ) : (
                          <PenTool className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-card-foreground">
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
                        <p className="text-sm text-foreground font-medium">
                          {item.topic}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">
                        {item.overallBand.toFixed(1)}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {getRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </div>
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

        {/* User Profile & Progress */}
        <div className="space-y-6">
          {/* User Profile Card */}
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <UserIcon className="h-5 w-5 text-secondary" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground font-medium">
                    Plan
                  </span>
                  <Badge
                    variant={profile.plan === "Free" ? "secondary" : "default"}
                  >
                    {profile.plan}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground font-medium">
                    Target Score
                  </span>
                  <span className="text-sm font-medium text-card-foreground">
                    {targetScore ?? "Not set"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-foreground font-medium">
                    Member Since
                  </span>
                  <span className="text-sm font-medium text-card-foreground">
                    {getDaysSinceMember(profile.createdAt)} days
                  </span>
                </div>

                {profile.targetTestDate && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-foreground font-medium">
                      Target Date
                    </span>
                    <span className="text-sm font-medium text-card-foreground">
                      {new Date(profile.targetTestDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Progress Overview */}
          {targetScore != null && averageBand != null && (
            <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <BarChart3 className="h-5 w-5 text-secondary" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-medium text-card-foreground">
                      Current Average
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {averageBand.toFixed(1)} / {targetScore}
                    </span>
                  </div>
                  <Progress
                    value={Math.min((averageBand / targetScore) * 100, 100)}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <Star className="h-5 w-5 text-secondary" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => navigate("/speaking")}
                className="w-full justify-start bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              >
                <Mic className="h-4 w-4 mr-2" />
                Start Speaking Practice
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => navigate("/writing")}
              >
                <PenTool className="h-4 w-4 mr-2" />
                Begin Writing Task
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                onClick={() => navigate("/feedback")}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Progress Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
