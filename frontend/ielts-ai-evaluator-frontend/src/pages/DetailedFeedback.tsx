import { Fragment } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { useNotebook } from "@/hooks/use-notebook";
import { SaveWordButton } from "@/components/notebook/SaveWordButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandScore } from "@/components/feedback/BandScore";
import { CriterionCard } from "@/components/feedback/CriterionCard";
import { DetailedFeedbackSkeleton } from "@/components/skeleton/DetailedFeedbackSkeleton";
import type { WritingEvaluationDetail } from "@/types/evaluation";
import { annotate } from "@/lib/writing-feedback";
import ErrorPage from "./ErrorPage";

const TASK_LABELS: Record<string, string> = {
  Task1: "Task 1",
  Task2: "Task 2",
};

const CRITERION_LABELS: Record<string, string> = {
  TaskResponse: "Task Response",
  TaskAchievement: "Task Achievement",
  CoherenceCohesion: "Coherence & Cohesion",
  LexicalResource: "Lexical Resource",
  GrammaticalRangeAccuracy: "Grammatical Range & Accuracy",
};

const DetailedFeedback = () => {
  const navigate = useNavigate();
  const { essayId } = useParams<{ essayId: string }>();

  const {
    data: evaluationData,
    isLoading,
    error,
  } = useApi<WritingEvaluationDetail>(`/api/v2/writing/evaluations/${essayId}`);
  const notebook = useNotebook();

  if (isLoading) {
    return <DetailedFeedbackSkeleton />;
  }

  if (error || !evaluationData) {
    return (
      <ErrorPage
        title="Error loading evaluation details"
        message={error?.message || "Evaluation not found"}
      />
    );
  }

  const { feedback } = evaluationData;
  const hasVocabUpgrades = feedback.vocabularyUpgrades.length > 0;
  const hasImprovedExcerpt = feedback.improvedExcerpt.trim().length > 0;
  const segments = annotate(evaluationData.essayText, feedback.errors.map((e) => e.quote));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" onClick={() => navigate("/feedback")}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {/* The layout header owns the h1 ("Writing Feedback"). */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {TASK_LABELS[evaluationData.taskType] ?? evaluationData.taskType}
            </p>
            <p className="text-2xl font-bold text-balance">
              {evaluationData.topic}
            </p>
          </div>
        </div>
        <div className="text-right">
          <BandScore band={evaluationData.overallBand} size="hero" />
          <p className="text-sm text-muted-foreground">Overall band</p>
          <p className="text-xs text-muted-foreground">
            {new Date(evaluationData.createdAt).toLocaleDateString(undefined, {
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
      </div>

      {/* Essay + corrections */}
      <Card>
        <CardHeader>
          <CardTitle>Your essay, annotated</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Capped measure: the card runs to 1152px, well past a readable line. */}
          <div className="max-w-[68ch] whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {segments.map((s, i) =>
              s.error === undefined ? (
                <Fragment key={i}>{s.text}</Fragment>
              ) : (
                // A link, not a tooltip: it works on touch, and the fix stays written in one place.
                <a
                  key={i}
                  href={`#correction-${s.error + 1}`}
                  className="rounded-sm bg-destructive/10 underline decoration-destructive decoration-wavy underline-offset-4 hover:bg-destructive/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {s.text}
                  <sup aria-hidden="true" className="ml-0.5 font-semibold text-destructive">
                    {s.error + 1}
                  </sup>
                  <span className="sr-only">, see correction {s.error + 1}</span>
                </a>
              ),
            )}
          </div>

          {feedback.errors.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Corrections</h3>
              <ol className="space-y-3">
                {feedback.errors.map((err, i) => (
                  // scroll-mt clears the 64px sticky header when a mark jumps here.
                  <li
                    key={i}
                    id={`correction-${i + 1}`}
                    className="flex gap-3 rounded-md text-sm scroll-mt-20 target:bg-destructive/10"
                  >
                    <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="line-through text-destructive">{err.quote}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-primary font-medium">{err.correction}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {err.category && (
                          <Badge variant="secondary" className="mr-2 capitalize">
                            {err.category}
                          </Badge>
                        )}
                        {err.rule}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Vocabulary upgrades + improved excerpt */}
      {(hasVocabUpgrades || hasImprovedExcerpt) && (
        <div className="grid gap-4 md:grid-cols-2">
          {hasVocabUpgrades && (
            <Card>
              <CardHeader>
                <CardTitle>Vocabulary upgrades</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {feedback.vocabularyUpgrades.map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p>
                        <span className="text-muted-foreground">{v.original}</span>
                        {" → "}
                        <span className="font-medium text-foreground">{v.upgrade}</span>
                      </p>
                      <p className="text-muted-foreground mt-0.5">{v.context}</p>
                    </div>
                    <SaveWordButton
                      notebook={notebook}
                      entry={{
                        word: v.upgrade,
                        replaces: v.original,
                        example: v.context,
                        source: "Writing",
                        sourceId: essayId,
                      }}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {hasImprovedExcerpt && (
            <Card className="bg-secondary border-border">
              <CardHeader>
                <CardTitle className="text-secondary-foreground">
                  Improved excerpt
                </CardTitle>
              </CardHeader>
              <CardContent>
                <blockquote className="border-l-2 border-border pl-4 italic text-secondary-foreground whitespace-pre-wrap">
                  {feedback.improvedExcerpt}
                </blockquote>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Footer actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={() => navigate("/feedback")}>
          View history
        </Button>
        <Button onClick={() => navigate("/writing")}>Practice again</Button>
      </div>
    </div>
  );
};

export default DetailedFeedback;
