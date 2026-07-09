import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import { BandScore } from "./BandScore";

export function CriterionCard({
  name,
  band,
  justification,
  examples,
  improvements,
}: {
  name: string;
  band: number;
  justification: string;
  examples: string[];
  improvements: string[];
}) {
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

        {examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-card-foreground">
              From your answer
            </p>
            <ul className="space-y-2">
              {examples.map((example, i) => (
                <li
                  key={i}
                  className="border-l-2 border-border pl-3 italic text-sm text-muted-foreground"
                >
                  {example}
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
