import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BandScore } from "./BandScore";

export function CriterionCard({
  name,
  band,
  justification,
  examples,
  improvements,
  rewrites,
}: {
  name: string;
  band: number;
  justification: string;
  examples: string[];
  improvements: string[];
  /** Speaking only, and absent on older sessions: the candidate's sentence and a better one. */
  rewrites?: { original: string; improved: string; explanation: string }[] | null;
}) {
  const hasRewrites = !!rewrites && rewrites.length > 0;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{name}</CardTitle>
          <BandScore band={band} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{justification}</p>

        {(examples.length > 0 || hasRewrites) && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-card-foreground">
              From your answer
            </p>
            <ul className="space-y-3">
              {examples.map((example, i) => (
                <li
                  key={`example-${i}`}
                  className="border-l-2 border-border pl-3 italic text-sm text-muted-foreground"
                >
                  {example}
                </li>
              ))}
              {/* Same quote styling as the examples above, so what they said reads the same
                  whether or not it came with a fix — the fix is what the arrow adds. */}
              {rewrites?.map((rewrite, i) => (
                <li key={`rewrite-${i}`} className="space-y-1 text-sm">
                  <p className="border-l-2 border-border pl-3 italic text-muted-foreground">
                    {rewrite.original}
                  </p>
                  <p className="flex items-start gap-2">
                    <ArrowRight
                      className="h-4 w-4 mt-0.5 shrink-0 text-primary"
                      aria-label="Better:"
                    />
                    <span className="font-medium text-foreground">
                      {rewrite.improved}
                    </span>
                  </p>
                  <p className="pl-6 text-xs text-muted-foreground">
                    {rewrite.explanation}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {improvements.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-card-foreground">
              How to improve
            </p>
            <ul className="space-y-2">
              {improvements.map((improvement, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                  <span>{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
