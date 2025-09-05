import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  History,
  TrendingUp,
  Mic,
  PenTool,
  Calendar,
  Clock,
  Target,
  BarChart3,
  Eye,
  Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { FeedbackHistorySkeleton } from "@/components/skeleton/FeedbackHistorySkeleton";
import type {
  EvaluationHistoryItem,
  EvaluationType,
} from "@/types/feedbackHistory";
import { useAuth } from "@/contexts/AuthContext";
import ErrorPage from "./ErrorPage";

const FeedbackHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EvaluationType>("all");
  const { user } = useAuth();

  // Fetch evaluation history data from API
  const {
    data: historyResponse,
    isLoading,
    error,
  } = useFetch<EvaluationHistoryItem[]>(
    `/api/evaluation-history?userId=${user?.userId}`
  );

  // Show loading state
  if (isLoading) {
    return <FeedbackHistorySkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <ErrorPage
        title="Error loading feedback history"
        message={error?.message || "Failed to load data"}
      />
    );
  }

  const feedbackHistory =
    historyResponse?.filter((history) => history.feedback != null) || [];

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 7.5) return "default";
    if (score >= 6.5) return "secondary";
    return "outline";
  };

  const averageScore =
    feedbackHistory.length > 0
      ? feedbackHistory.reduce((sum, item) => sum + item.overallBand, 0) /
        feedbackHistory.length
      : 0;

  const filteredHistory =
    activeTab === "all"
      ? feedbackHistory
      : feedbackHistory.filter((item) =>
          activeTab === "Speaking"
            ? item.evaluationType === "Speaking"
            : item.evaluationType === "Writing"
        );

  return (
    <div className="p-6 space-y-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Feedback History
          </h1>
          <p className="text-muted-foreground-bold text-lg">
            Track your progress and review detailed AI feedback
          </p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {averageScore.toFixed(1)}
                </p>
                <p className="text-sm text-muted-foreground-bold">
                  Average Score
                </p>
              </div>
              <Target className="h-8 w-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {feedbackHistory.length}
                </p>
                <p className="text-sm text-muted-foreground-bold">
                  Total Sessions
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {feedbackHistory.length > 0
                    ? Math.max(
                        ...feedbackHistory.map((item) => item.overallBand)
                      )
                    : 0}
                </p>
                <p className="text-sm text-muted-foreground-bold">
                  Highest Score
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-card-foreground">
                  {(() => {
                    if (feedbackHistory.length === 0) return 0;
                    const dates = feedbackHistory.map((item) =>
                      new Date(item.createdAt).toDateString()
                    );
                    const uniqueDates = new Set(dates);
                    return uniqueDates.size;
                  })()}
                </p>
                <p className="text-sm text-muted-foreground-bold">
                  Days Active
                </p>
              </div>
              <Calendar className="h-8 w-8 text-secondary/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <TrendingUp className="h-5 w-5 text-secondary" />
            Score Progress Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackHistory.length <= 0 && (
            <p className="text-muted-foreground">No feedback available</p>
          )}
          {feedbackHistory.length > 0 && (
            <div className="h-64 flex items-end justify-between bg-gradient-to-br from-primary/5 to-secondary/5 rounded-lg p-6">
              {feedbackHistory
                .slice()
                .reverse()
                .map((session) => (
                  <div
                    key={session.essayEvaluationId}
                    className="flex flex-col items-center gap-2"
                  >
                    <div className="text-xs text-muted-foreground-bold text-center">
                      {new Date(session.createdAt).toLocaleDateString("en-US", {
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </div>
                    <div
                      className="bg-gradient-to-t from-indigo-500 to-purple-600 rounded-t-lg w-8 flex items-end justify-center text-white text-xs font-medium"
                      style={{ height: `${(session.overallBand / 9) * 200}px` }}
                    >
                      {session.overallBand}
                    </div>
                    <div className="text-xs text-muted-foreground-bold text-center">
                      {session.evaluationType === "Speaking"
                        ? "S"
                        : session.taskType === "Task1"
                        ? "W1"
                        : "W2"}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed History with Tabs */}
      <Card className="border-0 shadow-lg bg-card backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <History className="h-5 w-5 text-secondary" />
            Session History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as EvaluationType)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger
                value="all"
                className="data-[state=active]:bg-card text-card-foreground"
              >
                All Sessions
              </TabsTrigger>
              <TabsTrigger
                value="Speaking"
                className="data-[state=active]:bg-card text-card-foreground"
              >
                Speaking
              </TabsTrigger>
              <TabsTrigger
                value="Writing"
                className="data-[state=active]:bg-card text-card-foreground"
              >
                Writing
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {filteredHistory.length == 0 && (
                <div className="text-center text-muted-foreground">
                  No sessions found.
                </div>
              )}

              {filteredHistory.length > 0 && (
                <div className="space-y-4">
                  {filteredHistory.map((session) => (
                    <div
                      key={session.essayEvaluationId}
                      className="border border-card-border rounded-lg p-6 bg-card-background-light/50 transition-colors hover:bg-card-background-light/80"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 rounded-full flex items-center justify-center">
                            {session.evaluationType === "Speaking" ? (
                              <Mic className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            ) : (
                              <PenTool className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold text-card-foreground text-lg">
                              {session.evaluationType === "Speaking"
                                ? "Speaking"
                                : `Writing ${
                                    session.taskType === "Task1"
                                      ? "Task 1"
                                      : "Task 2"
                                  }`}
                            </h3>
                            <p className="text-muted-foreground-bold">
                              {session.topic}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="flex items-center justify-end">
                            <Badge
                              variant={getScoreBadgeVariant(
                                session.overallBand
                              )}
                              className="text-sm font-medium bg-badge-indigo text-badge-indigo-foreground"
                            >
                              Band {session.overallBand}
                            </Badge>

                            <span className="text-sm font-medium text-muted-foreground-bold">
                              {/* No improvement calculation available yet */}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground-bold">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(session.createdAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(session.createdAt).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Score Breakdown */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        {Object.entries(session.feedback.criteria).map(
                          ([criteriaKey, criteriaData]) => (
                            <div key={criteriaKey} className="text-center">
                              <p className="text-xs text-muted-foreground-bold capitalize mb-1">
                                {criteriaKey === "taskResponse"
                                  ? "Task Response"
                                  : criteriaKey === "coherenceCohesion"
                                  ? "Coherence"
                                  : criteriaKey === "lexicalResource"
                                  ? "Vocabulary"
                                  : "Grammar"}
                              </p>
                              <p className="font-semibold text-indigo-600 dark:text-indigo-400 text-lg">
                                {criteriaData.band}
                              </p>
                              <Progress
                                value={(criteriaData.band / 9) * 100}
                                className="h-2 mt-1"
                              />
                            </div>
                          )
                        )}
                      </div>

                      {/* AI Feedback */}
                      <div className="bg-muted/50 rounded-lg p-4 mb-4 border border-card-border">
                        <h4 className="font-medium text-card-foreground mb-2">
                          AI Feedback
                        </h4>
                        <p className="text-sm text-muted-foreground-bold">
                          Overall band score: {session.feedback.overallBand}/9.
                          {session.feedback.criteria.taskResponse
                            .generalFeedback &&
                            ` ${session.feedback.criteria.taskResponse.generalFeedback.slice(
                              0,
                              150
                            )}...`}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-card-border text-card-foreground hover:bg-card-background-light"
                          onClick={() =>
                            navigate(`/feedback/${session.essayEvaluationId}`)
                          }
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-2 border-card-border text-card-foreground hover:bg-card-background-light"
                        >
                          <Download className="h-4 w-4" />
                          Export Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackHistory;
