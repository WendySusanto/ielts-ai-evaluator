import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SpeakingVocabularyUpgrade } from "@/types/Speaking";
import { ArrowRight } from "lucide-react";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Marks the suggested phrase inside the improved sentence, so "where would I use this" is
 * answered at a glance. The trailing \w* stretches the mark over an inflection ("exacerbate" →
 * "exacerbates").
 * ponytail: irregular forms ("take a toll" → "took a toll") and reordered phrases are not found
 * and simply render unmarked — the sentence still reads correctly. Match on a lemma list if
 * that happens often enough to matter. */
function Highlighted({ text, phrase }: { text: string; phrase: string }) {
  const match = phrase.trim()
    ? new RegExp(`${escapeRegExp(phrase.trim())}\\w*`, "i").exec(text)
    : null;
  if (!match) return <>{text}</>;
  return (
    <>
      {text.slice(0, match.index)}
      <mark className="rounded bg-primary/15 px-0.5 text-foreground">
        {match[0]}
      </mark>
      {text.slice(match.index + match[0].length)}
    </>
  );
}

/** C1/C2 words and phrases placed inside sentences the candidate actually said. The level is
 * Gemini's estimate, not a dictionary lookup, and the badge's title says so. */
export function VocabularyCard({ items }: { items: SpeakingVocabularyUpgrade[] }) {
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
