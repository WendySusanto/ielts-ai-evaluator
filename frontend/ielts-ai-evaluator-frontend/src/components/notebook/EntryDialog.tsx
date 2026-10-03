import { Loader2, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { friendlyError } from "@/lib/friendly-error";
import type { NotebookEntry, WordSuggestion } from "@/types/notebook";

export interface EntryFormValues {
  word: string;
  meaning: string | null;
  example: string | null;
  /** From "Fill with AI"; only a new entry stores it. */
  level: string | null;
}

/** Add (no entry) or edit (entry) one notebook word. Mount it only while open, so every opening
 * starts from the entry's current values. */
export function EntryDialog({
  entry,
  onSubmit,
  onClose,
}: {
  entry?: NotebookEntry;
  /** Resolves true when saved; the dialog stays open on failure so nothing typed is lost. */
  onSubmit: (values: EntryFormValues) => Promise<boolean>;
  onClose: () => void;
}) {
  const [word, setWord] = useState(entry?.word ?? "");
  const [meaning, setMeaning] = useState(entry?.meaning ?? "");
  const [example, setExample] = useState(entry?.example ?? "");
  const [level, setLevel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [filling, setFilling] = useState(false);
  // Set when the AI says the word isn't English — the browser's spellcheck underline is only a hint.
  const [notAWord, setNotAWord] = useState<{ word: string; suggestion: string | null } | null>(
    null,
  );

  /** Checks the word and drafts the empty fields. With both already filled, a click means
   * "give me another" and replaces both. */
  const fill = async (target = word.trim()) => {
    if (!target) return;
    setFilling(true);
    setNotAWord(null);
    try {
      const s = await api.post<WordSuggestion>("/api/v2/notebook/suggest", { word: target });
      if (!s.isWord) {
        setNotAWord({ word: target, suggestion: s.suggestion?.trim() || null });
        return;
      }
      const replaceBoth = !!meaning.trim() && !!example.trim();
      if (replaceBoth || !meaning.trim()) setMeaning(s.meaning);
      if (replaceBoth || !example.trim()) setExample(s.example);
      setLevel(s.level || null);
    } catch (e) {
      toast.error(
        e instanceof ApiError && e.status === 429
          ? friendlyError(e)
          : "Couldn't fill this right now — you can type it yourself.",
      );
    } finally {
      setFilling(false);
    }
  };

  const acceptSuggestion = (suggestion: string) => {
    setWord(suggestion);
    fill(suggestion);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit({
      word: word.trim(),
      meaning: meaning.trim() || null,
      example: example.trim() || null,
      level,
    });
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entry ? "Edit word" : "Add a word"}</DialogTitle>
          <DialogDescription>
            Type the word, then let AI check the spelling and draft a meaning and example you can
            edit. An example that uses the word becomes a fill-in-the-blank card in review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="nb-word">Word or phrase</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fill()}
                disabled={!word.trim() || filling}
              >
                {filling ? <Loader2 className="animate-spin" /> : <Sparkles />}
                Fill with AI
              </Button>
            </div>
            <Input
              id="nb-word"
              value={word}
              onChange={(e) => {
                setWord(e.target.value);
                setNotAWord(null);
                setLevel(null); // the level belonged to the word that was looked up
              }}
              maxLength={100}
              required
              autoFocus
              spellCheck
              lang="en"
              aria-invalid={!!notAWord}
              aria-describedby={notAWord ? "nb-word-check" : undefined}
              placeholder="e.g. mitigate"
            />
            {notAWord && (
              <p id="nb-word-check" role="status" className="text-sm text-destructive">
                “{notAWord.word}” doesn't look like an English word.{" "}
                {notAWord.suggestion ? (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() => acceptSuggestion(notAWord.suggestion!)}
                  >
                    Use “{notAWord.suggestion}”
                  </Button>
                ) : (
                  "Check the spelling."
                )}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nb-meaning">Meaning (optional)</Label>
            <Textarea
              id="nb-meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              maxLength={500}
              rows={2}
              spellCheck
              lang="en"
              placeholder="make something less severe"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nb-example">Example sentence (optional)</Label>
            <Textarea
              id="nb-example"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              maxLength={500}
              rows={2}
              spellCheck
              lang="en"
              placeholder="Governments should act to mitigate the effects of pollution."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || filling || !word.trim()}>
              {entry ? "Save changes" : "Add word"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
