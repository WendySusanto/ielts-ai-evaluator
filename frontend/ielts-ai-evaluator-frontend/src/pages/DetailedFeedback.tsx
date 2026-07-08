import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Award,
  BookOpen,
  ArrowLeft,
  TrendingUp,
  Sparkles,
  SpellCheck,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useApi } from "@/hooks/use-api";
import { DetailedFeedbackSkeleton } from "@/components/skeleton/DetailedFeedbackSkeleton";
import type { WritingEvaluationDetail } from "@/types/evaluation";
import ErrorPage from "./ErrorPage";

const getScoreBadgeVariant = (score: number) => {
  if (score >= 7.5) return "default";
  if (score >= 6.5) return "secondary";
  return "outline";
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

  const feedback = evaluationData.feedback;

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
            <h1 className="text-3xl font-bold">Detailed Feedback</h1>
            <p className="text-foreground font-medium">
              {evaluationData.taskType === "Task1" ? "Writing Task 1" : "Writing Task 2"} —{" "}
              {evaluationData.topic}
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
                  <h4 className="font-semibold text-sm mb-2">Examples from your essay</h4>
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
      </div>

      {/* Errors */}
      {feedback.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SpellCheck className="h-5 w-5 text-primary" />
              Errors Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.errors.map((err, i) => (
              <div key={i} className="border rounded-lg p-3 bg-muted border-border">
                <p className="text-sm">
                  <span className="line-through text-muted-foreground">"{err.quote}"</span>
                  {" → "}
                  <span className="font-medium">"{err.correction}"</span>
                </p>
                <p className="text-xs text-foreground font-medium mt-1">{err.rule}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vocabulary upgrades */}
      {feedback.vocabularyUpgrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Vocabulary Upgrades
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {feedback.vocabularyUpgrades.map((v, i) => (
              <div key={i} className="border rounded-lg p-3 bg-muted border-border">
                <p className="text-sm">
                  <span className="text-muted-foreground">{v.original}</span>
                  {" → "}
                  <span className="font-medium">{v.upgrade}</span>
                </p>
                <p className="text-xs text-foreground font-medium mt-1 italic">"{v.context}"</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Improved excerpt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Improved Excerpt
          </CardTitle>
          <CardDescription>
            One paragraph from your essay, rewritten at a higher band.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-6 leading-relaxed whitespace-pre-wrap">
            {feedback.improvedExcerpt}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate("/feedback")} variant="outline">
              Back to History
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground border-0"
              onClick={() => navigate("/writing")}
            >
              Practice More Writing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedFeedback;
