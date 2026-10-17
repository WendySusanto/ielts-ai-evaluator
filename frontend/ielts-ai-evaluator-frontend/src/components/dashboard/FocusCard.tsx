import { BandScore } from "@/components/feedback/BandScore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardFocus, FocusCriterion } from "@/types/dashboard";
import { ArrowRight, Target } from "lucide-react";

const CRITERION_LABELS: Record<string, string> = {
  TaskAchievementResponse: "Task Achievement / Response",
  CoherenceCohesion: "Coherence & Cohesion",
  FluencyCoherence: "Fluency & Coherence",
  LexicalResource: "Lexical Resource",
  GrammaticalRangeAccuracy: "Grammatical Range & Accuracy",
  Pronunciation: "Pronunciation",
};

function Weakest({ skill, criterion }: { skill: string; criterion: FocusCriterion }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {skill} · weakest criterion
      </p>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-medium text-card-foreground">
          {CRITERION_LABELS[criterion.name] ?? criterion.name}
        </p>
        <BandScore band={criterion.band} size="sm" />
      </div>
      {criterion.tip && <p className="text-sm text-muted-foreground">{criterion.tip}</p>}
    </div>
  );
}

/** What to practise next: the criterion holding each skill back, and the mistakes that keep
 * coming back. The API reads it from feedback already stored, with no model call. */
export function FocusCard({ focus }: { focus: DashboardFocus }) {
  const { writing, speaking, mistakes } = focus;
  if (!writing && !speaking && mistakes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle asChild>
          <h2 className="flex items-center gap-2 text-card-foreground">
            <Target className="h-5 w-5 text-muted-foreground" />
            Focus Areas
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {(writing || speaking) && (
          <div className="grid gap-6 md:grid-cols-2">
            {writing && <Weakest skill="Writing" criterion={writing} />}
            {speaking && <Weakest skill="Speaking" criterion={speaking} />}
          </div>
        )}
        {mistakes.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <h3 className="text-sm font-semibold">Recurring mistakes</h3>
            <ul className="space-y-3">
              {mistakes.map((m) => (
                <li key={m.category} className="space-y-1 text-sm">
                  <p className="font-medium capitalize text-card-foreground">
                    {m.category}{" "}
                    <span className="tabular-nums text-muted-foreground">×{m.count}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="line-through text-destructive">{m.original}</span>
                    <ArrowRight
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-label="Correct:"
                    />
                    <span className="font-medium text-primary">{m.corrected}</span>
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
