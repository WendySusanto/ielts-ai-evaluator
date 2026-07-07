import { DetailedFeedbackSkeleton } from "@/components/skeleton/DetailedFeedbackSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useApi } from "@/hooks/use-api";
import type { SpeakingDetail } from "@/types/Speaking";
import {
  AlertCircle,
  ArrowLeft,
  Award,
  MessageSquare,
  Mic,
  TrendingUp,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage";

const CRITERIA_LABELS: Record<string, string> = {
  fluencyCoherence: "Fluency & Coherence",
  lexicalResource: "Lexical Resource",
  grammaticalRangeAccuracy: "Grammar & Accuracy",
  pronunciation: "Pronunciation",
};

const getScoreColor = (score: number) => {
  if (score >= 7.5) return "text-green-600 dark:text-green-400";
  if (score >= 6.5) return "text-blue-600 dark:text-blue-400";
  if (score >= 5.5) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
};

const getScoreBadgeVariant = (score: number) => {
  if (score >= 7.5) return "default";
  if (score >= 6.5) return "secondary";
  return "outline";
};

const SpeakingFeedback = () => {
  const navigate = useNavigate();
  const { speakingId } = useParams<{ speakingId: string }>();

  const {
    data: detail,
    isLoading,
    error,
  } = useApi<SpeakingDetail>(`/api/speaking-detail?id=${speakingId}`);

  if (isLoading) {
    return <DetailedFeedbackSkeleton />;
  }

  if (error || !detail) {
    return (
      <ErrorPage
        title="Error loading evaluation details"
        message={error?.message || "Evaluation not found"}
      />
    );
  }

  const feedback = detail.feedback;
  const partLabel =
    detail.part === "Part1"
      ? "Part 1"
      : detail.part === "Part2"
        ? "Part 2"
        : "Part 3";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/feedback")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Speaking Feedback
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {partLabel} — {detail.topic}
            </p>
          </div>
        </div>
        <Badge
          variant={getScoreBadgeVariant(feedback.overallBand)}
          className="text-lg px-4 py-2"
        >
          <Award className="h-4 w-4 mr-2" />
          Band {feedback.overallBand}
        </Badge>
      </div>

      {/* Overall performance */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary-foreground">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Object.entries(feedback.criteria).map(([key, criteria]) => (
              <div key={key} className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {CRITERIA_LABELS[key]}
                </p>
                <p
                  className={`text-2xl font-bold ${getScoreColor(criteria.band)}`}
                >
                  {criteria.band}
                </p>
                <Progress
                  value={(criteria.band / 9) * 100}
                  className="h-2 mt-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Your Transcript
          </CardTitle>
          <CardDescription>
            This is what we transcribed from your spoken answer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 leading-relaxed whitespace-pre-wrap">
            {detail.transcript}
          </div>
        </CardContent>
      </Card>

      {/* Criteria breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(feedback.criteria).map(([key, criteria]) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  {CRITERIA_LABELS[key]}
                </span>
                <Badge variant={getScoreBadgeVariant(criteria.band)}>
                  Band {criteria.band}
                </Badge>
              </CardTitle>
              {criteria.generalFeedback && (
                <CardDescription>{criteria.generalFeedback}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {Object.entries(criteria.subScores).map(
                  ([subKey, subScore]) => (
                    <div key={subKey} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {subKey.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span
                          className={`font-semibold ${getScoreColor(subScore.score)}`}
                        >
                          {subScore.score}/9
                        </span>
                      </div>
                      <Progress
                        value={(subScore.score / 9) * 100}
                        className="h-1"
                      />
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {subScore.comment}
                      </p>
                    </div>
                  ),
                )}
              </div>

              {criteria.issues.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    Specific Issues Found
                  </h4>
                  <div className="space-y-2">
                    {criteria.issues.map((issue, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 bg-muted border-border"
                      >
                        <p className="text-sm font-medium mb-1">
                          "{issue.text}"
                        </p>
                        <p className="text-xs text-foreground font-medium">
                          {issue.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/feedback")} variant="outline">
              Back to History
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              onClick={() => navigate("/speaking")}
            >
              Practice More Speaking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SpeakingFeedback;
