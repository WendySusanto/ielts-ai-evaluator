import { ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BandScore } from "@/components/feedback/BandScore";
import { CriterionCard } from "@/components/feedback/CriterionCard";
import { DetailedFeedbackSkeleton } from "@/components/skeleton/DetailedFeedbackSkeleton";
import type { WritingEvaluationDetail } from "@/types/evaluation";
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
              {TASK_LABELS[evaluationData.taskType] ?? evaluationData.taskType} ·{" "}
              {evaluationData.topic}
            </p>
            <h1 className="text-3xl font-bold">Writing feedback</h1>
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
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {evaluationData.essayText}
          </div>

          {feedback.errors.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">Corrections</h3>
              {/* ponytail: a matched-quote list is v1 of annotation; true inline
                  highlighting of the essay text above is deferred until we need it */}
              <ul className="space-y-3">
                {feedback.errors.map((err, i) => (
                  <li key={i} className="text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="line-through text-destructive">{err.quote}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-primary font-medium">{err.correction}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{err.rule}</p>
                  </li>
                ))}
              </ul>
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
                  <div key={i} className="text-sm">
                    <p>
                      <span className="text-muted-foreground">{v.original}</span>
                      {" → "}
                      <span className="font-medium text-foreground">{v.upgrade}</span>
                    </p>
                    <p className="text-muted-foreground mt-0.5">{v.context}</p>
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
