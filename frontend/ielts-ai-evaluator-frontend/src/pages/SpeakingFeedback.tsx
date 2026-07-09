import { ArrowLeft, AudioLines } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandScore } from "@/components/feedback/BandScore";
import { CriterionCard } from "@/components/feedback/CriterionCard";
import { SpeakingFeedbackSkeleton } from "@/components/skeleton/SpeakingFeedbackSkeleton";
import type { SpeakingSessionDetail } from "@/types/Speaking";
import ErrorPage from "./ErrorPage";

const PART_LABELS: Record<string, string> = {
  Part1: "Part 1",
  Part2: "Part 2",
  Part3: "Part 3",
};

const CRITERION_LABELS: Record<string, string> = {
  FluencyCoherence: "Fluency & Coherence",
  LexicalResource: "Lexical Resource",
  GrammaticalRangeAccuracy: "Grammatical Range & Accuracy",
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
    return <SpeakingFeedbackSkeleton />;
  }

  if (error || !detail) {
    return (
      <ErrorPage
        title="Error loading evaluation details"
        message={error?.message || "Evaluation not found"}
      />
    );
  }

  const { feedback } = detail;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" onClick={() => navigate("/feedback")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {PART_LABELS[detail.part] ?? detail.part} · {detail.topic}
            </p>
            <h1 className="text-3xl font-bold">Speaking feedback</h1>
          </div>
        </div>
        <div className="text-right">
          <BandScore band={detail.overallBand} size="hero" />
          <p className="text-sm text-muted-foreground">Overall band</p>
          <p className="text-xs text-muted-foreground">
            {new Date(detail.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-secondary border-border">
        <CardContent className="pt-6">
          <p className="text-secondary-foreground">{feedback.summary}</p>
        </CardContent>
      </Card>

      {/* Criteria breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        {feedback.criteria.map((criterion) => (
          <CriterionCard
            key={criterion.name}
            name={CRITERION_LABELS[criterion.name] ?? criterion.name}
            band={criterion.band}
            justification={criterion.justification}
            examples={criterion.examples}
            improvements={criterion.improvements}
          />
        ))}

        {/* Pronunciation — Azure PA lands in Phase 4. Header shape matches
            CriterionCard's so this slot can be swapped in seamlessly. */}
        {detail.pronunciation === null && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Not assessed yet</CardTitle>
                <AudioLines className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pronunciation scoring with per-word analysis arrives with the live
                examiner.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transcript */}
      <Card>
        <CardHeader>
          <CardTitle>Your conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail.turns.map((turn, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                turn.role === "candidate" ? "items-end" : "items-start"
              }`}
            >
              <p className="text-xs text-muted-foreground mb-1">
                {turn.role === "candidate" ? "You" : "Examiner"}
              </p>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  turn.role === "candidate"
                    ? "bg-secondary text-secondary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {turn.text}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate("/feedback")}>
          View history
        </Button>
        <Button onClick={() => navigate("/speaking")}>Practice again</Button>
      </div>
    </div>
  );
};

export default SpeakingFeedback;
