import { ArrowLeft, AudioLines } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BandScore } from "@/components/feedback/BandScore";
import { CriterionCard } from "@/components/feedback/CriterionCard";
import { PausedTranscript } from "@/components/feedback/PausedTranscript";
import { VocabularyCard } from "@/components/feedback/VocabularyCard";
import { LONG_PAUSE_SECONDS } from "@/lib/lexical";
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

// ponytail: rough conversational norms, not IELTS thresholds — the band descriptors name slow
// speech as a symptom and set no target rate. Same ranges the scoring prompt is given.
const SLOW_WPM = 100;
const FAST_WPM = 170;
const paceLabel = (wpm: number) =>
  wpm < SLOW_WPM ? "slow" : wpm > FAST_WPM ? "fast" : "natural";

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
            rewrites={criterion.rewrites}
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

              {pronunciation.wordsPerMinute != null && (
                <div className="space-y-1 border-t border-border pt-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Speaking pace</span>
                    <span>
                      <span className="font-medium tabular-nums">
                        {Math.round(pronunciation.wordsPerMinute)}
                      </span>{" "}
                      words/min · {paceLabel(pronunciation.wordsPerMinute)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Natural conversation is roughly {SLOW_WPM}–{FAST_WPM}. IELTS
                    doesn't score speed itself, but slow speech is a sign of
                    hesitation.
                  </p>
                </div>
              )}

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
                    // ponytail: native <details>, no useState toggle
                    <details className="group space-y-2">
                      <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
                        +{problemWords.length - MAX_PROBLEM_WORDS} more
                        <span className="group-open:hidden"> — show</span>
                        <span className="hidden group-open:inline"> — hide</span>
                      </summary>
                      <div className="flex flex-wrap gap-2">
                        {problemWords.slice(MAX_PROBLEM_WORDS).map((word, i) => (
                          <Badge
                            key={`${word.word}-more-${i}`}
                            variant="secondary"
                          >
                            {word.word} · {Math.round(word.accuracyScore)}%
                          </Badge>
                        ))}
                      </div>
                    </details>
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

      {feedback.vocabulary && feedback.vocabulary.length > 0 && (
        <VocabularyCard items={feedback.vocabulary} />
      )}

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
              {/* The bubble shows display text, which the recognizer punctuates and tidies.
                  Spoken answers can show what was actually said, and where it stopped.
                  ponytail: native <details>, no useState toggle */}
              {turn.lexical && (
                <details className="group mt-1 max-w-[85%]">
                  <summary className="cursor-pointer list-none text-xs text-muted-foreground hover:text-foreground">
                    <span className="group-open:hidden">Show pauses</span>
                    <span className="hidden group-open:inline">Hide pauses</span>
                  </summary>
                  <div className="mt-2 rounded-2xl border border-dashed px-4 py-2">
                    <PausedTranscript lexical={turn.lexical} />
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="mr-1 inline-block h-2 w-4 rounded-full bg-chart-4 align-middle" />
                      under {LONG_PAUSE_SECONDS}s
                      <span className="ml-3 mr-1 inline-block h-2 w-4 rounded-full bg-destructive align-middle" />
                      longer
                    </p>
                  </div>
                </details>
              )}
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
