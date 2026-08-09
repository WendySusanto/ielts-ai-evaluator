import { ArrowLeft, AudioLines } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BandScore } from "@/components/feedback/BandScore";
import { CriterionCard } from "@/components/feedback/CriterionCard";
import { SpeakingFeedbackSkeleton } from "@/components/skeleton/SpeakingFeedbackSkeleton";
import type { SpeakingSessionDetail } from "@/types/Speaking";
import ErrorPage from "./ErrorPage";

const PRONUNCIATION_METERS = [
  { key: "accuracyScore", label: "Accuracy" },
  { key: "fluencyScore", label: "Fluency" },
  { key: "prosodyScore", label: "Prosody" },
  { key: "completenessScore", label: "Completeness" },
] as const;

const MAX_PROBLEM_WORDS = 20;

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

  const { feedback, pronunciation } = detail;
  const problemWords = pronunciation
    ? pronunciation.words.filter(
        (w) => w.errorType !== "None" || w.accuracyScore < 70,
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" onClick={() => navigate("/feedback")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {/* The layout header owns the h1 ("Speaking Feedback"). */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {PART_LABELS[detail.part] ?? detail.part}
            </p>
            <p className="text-2xl font-bold text-balance">{detail.topic}</p>
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

        {/* Pronunciation — Azure PA. Header shape matches CriterionCard's. */}
        {pronunciation ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Pronunciation</CardTitle>
                <BandScore band={pronunciation.band ?? 0} size="sm" />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {PRONUNCIATION_METERS.map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{label}</span>
                      <span className="tabular-nums">
                        {Math.round(pronunciation[key])}
                      </span>
                    </div>
                    <Progress
                      value={pronunciation[key]}
                      aria-label={`${label} score`}
                    />
                  </div>
                ))}
              </div>

              {problemWords.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-card-foreground">
                    Words to practice
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {problemWords.slice(0, MAX_PROBLEM_WORDS).map((word, i) => (
                      <Badge key={`${word.word}-${i}`} variant="secondary">
                        {word.word} · {Math.round(word.accuracyScore)}%
                      </Badge>
                    ))}
                  </div>
                  {problemWords.length > MAX_PROBLEM_WORDS && (
                    <p className="text-xs text-muted-foreground">
                      +{problemWords.length - MAX_PROBLEM_WORDS} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
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
