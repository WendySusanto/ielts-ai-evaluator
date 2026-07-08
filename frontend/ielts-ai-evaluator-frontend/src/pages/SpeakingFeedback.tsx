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
import { useApi } from "@/hooks/use-api";
import type { SpeakingSessionDetail } from "@/types/Speaking";
import { ArrowLeft, Award, Mic, TrendingUp } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import ErrorPage from "./ErrorPage";

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
  } = useApi<SpeakingSessionDetail>(`/api/v2/speaking/sessions/${speakingId}`);

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
    detail.part === "Part1" ? "Part 1" : detail.part === "Part2" ? "Part 2" : "Part 3";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
            <h1 className="text-3xl font-bold">Speaking Feedback</h1>
            <p className="text-foreground font-medium">
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

      {/* Summary */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-secondary-foreground">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-secondary-foreground">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Conversation Transcript
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.turns.map((turn, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 ${
                turn.role === "candidate"
                  ? "bg-secondary text-secondary-foreground ml-8"
                  : "bg-muted text-foreground mr-8"
              }`}
            >
              <p className="text-xs font-semibold mb-1 capitalize">{turn.role}</p>
              <p className="text-sm whitespace-pre-wrap">{turn.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Criteria breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {feedback.criteria.map((criterion) => (
          <Card key={criterion.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{criterion.name.replace(/([A-Z])/g, " $1").trim()}</span>
                <Badge variant={getScoreBadgeVariant(criterion.band)}>
                  Band {criterion.band}
                </Badge>
              </CardTitle>
              <CardDescription>{criterion.justification}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {criterion.examples.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Examples from your turns</h4>
                  <div className="space-y-2">
                    {criterion.examples.map((example, i) => (
                      <p
                        key={i}
                        className="text-sm italic border-l-2 border-border pl-3 text-foreground"
                      >
                        "{example}"
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {criterion.improvements.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">How to improve</h4>
                  <ul className="space-y-1 list-disc list-inside text-sm text-foreground">
                    {criterion.improvements.map((improvement, i) => (
                      <li key={i}>{improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Pronunciation — Azure PA lands in Phase 4; placeholder until then. */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pronunciation</span>
              <Badge variant="outline">Not assessed</Badge>
            </CardTitle>
            <CardDescription>
              {detail.pronunciation
                ? "Pronunciation data received but not yet rendered."
                : "Pronunciation assessment is not available yet for this session."}
            </CardDescription>
          </CardHeader>
        </Card>
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
