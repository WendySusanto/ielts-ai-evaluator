import { SaveWordButton } from "@/components/notebook/SaveWordButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Notebook } from "@/hooks/use-notebook";
import { findPhrase } from "@/lib/notebook";
import type { SpeakingVocabularyUpgrade } from "@/types/Speaking";
import { ArrowRight } from "lucide-react";

/** Marks the suggested phrase inside the improved sentence, so "where would I use this" is
 * answered at a glance. A phrase findPhrase can't locate renders unmarked — the sentence still
 * reads correctly. */
function Highlighted({ text, phrase }: { text: string; phrase: string }) {
  const parts = findPhrase(text, phrase);
  if (!parts) return <>{text}</>;
  return (
    <>
      {parts[0]}
      <mark className="rounded bg-primary/15 px-0.5 text-foreground">{parts[1]}</mark>
      {parts[2]}
    </>
  );
}

/** C1/C2 words and phrases placed inside sentences the candidate actually said. The level is
 * Gemini's estimate, not a dictionary lookup, and the badge's title says so. */
export function VocabularyCard({
  items,
  sessionId,
  notebook,
}: {
  items: SpeakingVocabularyUpgrade[];
  sessionId: string;
  notebook: Notebook;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vocabulary to level up</CardTitle>
        <p className="text-sm text-muted-foreground">
          Higher-level words that fit what you already said. Use them where they sound natural —
          examiners reward precision, not rare words for their own sake.
        </p>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-5 md:grid-cols-2">
          {items.map((item, i) => (
            <li key={i} className="space-y-1.5 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">{item.phrase}</span>
                <Badge variant="secondary" title="Approximate CEFR level">
                  {item.level}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  instead of “{item.replaces}”
                </span>
                <SaveWordButton
                  className="ml-auto"
                  notebook={notebook}
                  entry={{
                    word: item.phrase,
                    replaces: item.replaces,
                    example: item.original,
                    level: item.level,
                    source: "Speaking",
                    sourceId: sessionId,
                  }}
                />
              </div>
              <p className="border-l-2 border-border pl-3 italic text-muted-foreground">
                {item.original}
              </p>
              <p className="flex items-start gap-2">
                <ArrowRight
                  className="h-4 w-4 mt-0.5 shrink-0 text-primary"
                  aria-label="Better:"
                />
                <span className="text-foreground">
                  <Highlighted text={item.improved} phrase={item.phrase} />
                </span>
              </p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
