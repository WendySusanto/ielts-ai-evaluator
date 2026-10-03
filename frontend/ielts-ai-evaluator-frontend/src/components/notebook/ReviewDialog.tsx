import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import type { Notebook } from "@/hooks/use-notebook";
import { cardFront, shuffle } from "@/lib/notebook";
import type { NotebookEntry } from "@/types/notebook";
import { SpeakButton } from "./SpeakButton";

const MARK = "rounded bg-primary/15 px-0.5 text-foreground";

function Front({ entry }: { entry: NotebookEntry }) {
  const front = cardFront(entry);
  if (front.kind === "upgrade") {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          Find a stronger word for “{front.replaces}”
        </p>
        <p className="text-lg leading-relaxed">
          {front.parts ? (
            <>
              {front.parts[0]}
              <mark className={MARK}>{front.parts[1]}</mark>
              {front.parts[2]}
            </>
          ) : (
            front.sentence
          )}
        </p>
      </>
    );
  }
  if (front.kind === "cloze") {
    return (
      <>
        <p className="text-sm text-muted-foreground">Fill in the blank</p>
        <p className="text-lg leading-relaxed">
          {front.parts[0]}
          <span className="font-mono tracking-widest text-primary">_____</span>
          {front.parts[2]}
        </p>
        {front.hint && <p className="text-sm text-muted-foreground">Hint: {front.hint}</p>}
      </>
    );
  }
  return (
    <>
      <p className="text-sm text-muted-foreground">What does it mean? Use it in a sentence.</p>
      <p className="text-3xl font-bold">{front.word}</p>
    </>
  );
}

function Back({ entry }: { entry: NotebookEntry }) {
  return (
    <div className="space-y-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-2xl font-bold text-primary">{entry.word}</p>
        {entry.level && <Badge variant="secondary">{entry.level}</Badge>}
        <SpeakButton text={entry.word} />
      </div>
      {entry.meaning && <p className="text-sm">{entry.meaning}</p>}
      {entry.example && !entry.replaces && (
        <p className="border-l-2 border-border pl-3 text-sm italic text-muted-foreground">
          {entry.example}
        </p>
      )}
    </div>
  );
}

/** Flashcards over the words still being learned, in random order. "Mastered" saves straight
 * away; "Still learning" keeps the word for the next round. */
export function ReviewDialog({
  entries,
  notebook,
  onClose,
}: {
  entries: NotebookEntry[];
  notebook: Notebook;
  onClose: () => void;
}) {
  const [deck, setDeck] = useState(() => shuffle(entries));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  const current = deck[index];
  const next = () => {
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const markMastered = async () => {
    const saved = await notebook.update(current.notebookEntryId, {
      word: current.word,
      meaning: current.meaning,
      example: current.example,
      mastered: true,
    });
    if (!saved) return;
    setMasteredIds((ids) => new Set(ids).add(current.notebookEntryId));
    next();
  };

  const stillLearning = deck.filter((e) => !masteredIds.has(e.notebookEntryId));
  const again = () => {
    setDeck(shuffle(stillLearning));
    setMasteredIds(new Set());
    setIndex(0);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review</DialogTitle>
          <DialogDescription>
            {current ? `Card ${index + 1} of ${deck.length}` : "Round complete"}
          </DialogDescription>
        </DialogHeader>
        <Progress value={(index / deck.length) * 100} aria-label="Review progress" />

        {current ? (
          <div className="space-y-4">
            <div className="min-h-32 space-y-3">
              <Front entry={current} />
              {revealed && <Back entry={current} />}
            </div>
            {revealed ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={next}>
                  Still learning
                </Button>
                <Button onClick={markMastered}>Mastered</Button>
              </div>
            ) : (
              <div className="flex justify-end">
                <Button onClick={() => setRevealed(true)} autoFocus>
                  Show answer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p>
              {masteredIds.size} mastered · {stillLearning.length} still learning
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Done
              </Button>
              {stillLearning.length > 0 && <Button onClick={again}>Review again</Button>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
