import { useState, type FormEvent } from "react";
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
import type { NotebookEntry } from "@/types/notebook";

export interface EntryFormValues {
  word: string;
  meaning: string | null;
  example: string | null;
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
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await onSubmit({
      word: word.trim(),
      meaning: meaning.trim() || null,
      example: example.trim() || null,
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
            An example sentence that uses the word turns it into a fill-in-the-blank card in review.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nb-word">Word or phrase</Label>
            <Input
              id="nb-word"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              maxLength={100}
              required
              autoFocus
              placeholder="e.g. mitigate"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nb-meaning">Meaning (optional)</Label>
            <Textarea
              id="nb-meaning"
              value={meaning}
              onChange={(e) => setMeaning(e.target.value)}
              maxLength={500}
              rows={2}
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
              placeholder="Governments should act to mitigate the effects of pollution."
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !word.trim()}>
              {entry ? "Save changes" : "Add word"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
