import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { groupByCategory } from "@/lib/speaking-feedback";
import type { SpeakingError } from "@/types/Speaking";
import { ArrowRight } from "lucide-react";

/** Every grammar and word-choice mistake in the session, grouped by kind so a pattern
 * ("tense · 4") reads at a glance. Same quote → arrow → fix layout as the criterion rewrites. */
export function ErrorsCard({ errors }: { errors: SpeakingError[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Mistakes to fix</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {groupByCategory(errors).map(([category, items]) => (
          <div key={category} className="space-y-2">
            <p className="text-sm font-medium capitalize text-card-foreground">
              {category}{" "}
              <span className="tabular-nums text-muted-foreground">· {items.length}</span>
            </p>
            <ul className="space-y-3">
              {items.map((error, i) => (
                <li key={i} className="space-y-1 text-sm">
                  <p className="border-l-2 border-border pl-3 italic text-muted-foreground">
                    {error.original}
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight
                      className="h-4 w-4 mt-0.5 shrink-0 text-primary"
                      aria-label="Correct:"
                    />
                    <span className="font-medium text-foreground">{error.corrected}</span>
                  </p>
                  <p className="pl-6 text-xs text-muted-foreground">{error.explanation}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
