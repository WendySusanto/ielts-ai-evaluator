import { BandScore } from "@/components/feedback/BandScore";
import { FeedbackHistorySkeleton } from "@/components/skeleton/FeedbackHistorySkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApi } from "@/hooks/use-api";
import { getRelativeTime } from "@/lib/utils";
import type { EvaluationType, WritingHistoryItem } from "@/types/feedbackHistory";
import type { SpeakingSessionHistoryItem } from "@/types/Speaking";
import { ChevronRight, Mic, PenTool } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ErrorPage from "./ErrorPage";

// A unified shape so writing and speaking sessions render in one timeline.
interface UnifiedHistoryItem {
  id: string;
  evaluationType: "Writing" | "Speaking";
  taskType: string; // Task1/Task2 or Part1/Part2/Part3
  topic: string;
  overallBand: number;
  createdAt: string;
  detailPath: string;
}

const TASK_LABELS: Record<string, string> = {
  Task1: "Task 1",
  Task2: "Task 2",
  Part1: "Part 1",
  Part2: "Part 2",
  Part3: "Part 3",
};


function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

const EMPTY_STATE: Record<EvaluationType, { message: string; ctaLabel: string; ctaPath: string }> = {
  all: { message: "No feedback yet", ctaLabel: "Start a session", ctaPath: "/writing" },
  Writing: { message: "No writing evaluations yet", ctaLabel: "Start writing", ctaPath: "/writing" },
  Speaking: { message: "No speaking sessions yet", ctaLabel: "Start speaking", ctaPath: "/speaking" },
};

const FeedbackHistory = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<EvaluationType>("all");

  // Fetch writing + speaking history in parallel.
  const {
    data: writingResponse,
    isLoading: writingLoading,
    error: writingError,
    refetch: refetchWriting,
  } = useApi<WritingHistoryItem[]>("/api/v2/writing/evaluations");

  const {
    data: speakingResponse,
    isLoading: speakingLoading,
    error: speakingError,
    refetch: refetchSpeaking,
  } = useApi<SpeakingSessionHistoryItem[]>("/api/v2/speaking/sessions");

  const isLoading = writingLoading || speakingLoading;
  const error = writingError || speakingError;

  const feedbackHistory = useMemo<UnifiedHistoryItem[]>(() => {
    const writing: UnifiedHistoryItem[] = (writingResponse || []).map((h) => ({
      id: h.writingEvaluationId,
      evaluationType: "Writing",
      taskType: h.taskType,
      topic: h.topic,
      overallBand: h.overallBand,
      createdAt: h.createdAt,
      detailPath: `/feedback/${h.writingEvaluationId}`,
    }));

    const speaking: UnifiedHistoryItem[] = (speakingResponse || []).map((h) => ({
      id: h.speakingSessionId,
      evaluationType: "Speaking",
      taskType: h.part,
      topic: h.topic,
      overallBand: h.overallBand,
      createdAt: h.createdAt,
      detailPath: `/speaking-feedback/${h.speakingSessionId}`,
    }));

    return [...writing, ...speaking].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [writingResponse, speakingResponse]);

  if (isLoading) {
    return <FeedbackHistorySkeleton />;
  }

  if (error) {
    return (
      <ErrorPage
        title="Error loading feedback history"
        message={error?.message || "Failed to load data"}
        onRetry={() => {
          refetchWriting();
          refetchSpeaking();
        }}
      />
    );
  }

  const writingAverage = average(feedbackHistory.filter((i) => i.evaluationType === "Writing").map((i) => i.overallBand));
  const speakingAverage = average(feedbackHistory.filter((i) => i.evaluationType === "Speaking").map((i) => i.overallBand));

  const filteredHistory =
    activeTab === "all"
      ? feedbackHistory
      : feedbackHistory.filter((item) => item.evaluationType === activeTab);

  const emptyState = EMPTY_STATE[activeTab];

  return (
    <div className="space-y-6 min-h-full">
      {/* Header — the layout header owns the h1 ("Feedback History"). */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted-foreground">
          Track your progress and review detailed AI feedback
        </p>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as EvaluationType)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="Writing">Writing</TabsTrigger>
            <TabsTrigger value="Speaking">Speaking</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary */}
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total sessions", value: feedbackHistory.length, band: null },
          { label: "Writing average", value: null, band: writingAverage },
          { label: "Speaking average", value: null, band: speakingAverage },
        ].map(({ label, value, band }) => (
          <Card key={label} className="gap-1 p-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd>
              {band !== null ? (
                <BandScore band={band} size="md" />
              ) : (
                <span className="text-2xl font-bold tabular-nums text-foreground">
                  {value ?? "—"}
                </span>
              )}
            </dd>
          </Card>
        ))}
      </dl>

      {/* List */}
      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">{emptyState.message}</p>
          <Button onClick={() => navigate(emptyState.ctaPath)}>{emptyState.ctaLabel}</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.detailPath)}
              className="flex w-full min-h-11 items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                {item.evaluationType === "Speaking" ? (
                  <Mic className="h-5 w-5 text-secondary-foreground" />
                ) : (
                  <PenTool className="h-5 w-5 text-secondary-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{item.topic}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {item.evaluationType} · {TASK_LABELS[item.taskType] ?? item.taskType}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <BandScore band={item.overallBand} size="sm" />
                <span className="text-xs text-muted-foreground">
                  {getRelativeTime(item.createdAt)}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedbackHistory;
