// Kept out of use-speech.ts so it can be exercised without pulling in React and the Azure SDK:
// `npm run check:lexical`. Pure arithmetic, no imports.

// Azure reports word offsets and durations in 100-ns ticks.
const TICKS_PER_MS = 10_000;
// ponytail: 1s is a hand-picked line between "natural beat" and "hesitation an examiner notices".
// Tune against real marked sessions before trusting the band it feeds.
const PAUSE_THRESHOLD_MS = 1000;

/** A recognized word at its absolute position in the session audio, so gaps between segments —
 * the long silences that matter most — come out of the same arithmetic. */
export interface TimedWord {
  Word: string;
  Offset: number;
  Duration: number;
}

/** A candidate turn as Azure's raw lexical text, with [pause N.Ns] where words sit ≥ PAUSE_THRESHOLD_MS
 * apart. Display text hides hesitations and flatters grammar; this goes beside it to compare. */
export function buildLexicalTranscript(words: TimedWord[]): string {
  const parts: string[] = [];
  let prevEnd: number | null = null;
  for (const w of words) {
    if (prevEnd !== null) {
      const gapMs = (w.Offset - prevEnd) / TICKS_PER_MS;
      if (gapMs >= PAUSE_THRESHOLD_MS) parts.push(`[pause ${(gapMs / 1000).toFixed(1)}s]`);
    }
    parts.push(w.Word);
    prevEnd = w.Offset + w.Duration;
  }
  return parts.join(" ");
}

/** Seconds from the first word's start to the last word's end (inner pauses count, lead-in doesn't);
 * 0 if nothing was recognized. Kept raw — the server derives the speech rate. */
export function speakingSeconds(words: TimedWord[]): number {
  if (words.length === 0) return 0;
  const last = words[words.length - 1];
  return (last.Offset + last.Duration - words[0].Offset) / TICKS_PER_MS / 1000;
}

// ponytail: colour by duration only; where a pause falls (mid-clause vs before an idea) matters
// more but needs clause alignment. Upgrade if the colours disagree with the band.
export const LONG_PAUSE_SECONDS = 2;

export type LexicalSegment =
  | { kind: "text"; text: string }
  | { kind: "pause"; seconds: number };

const PAUSE_MARKER = /\[pause (\d+(?:\.\d+)?)s\]/g;

/** Splits a transcript from buildLexicalTranscript back into words and pauses, so the UI can
 * draw the pauses instead of printing them. Both live here so one file owns the marker format. */
export function parseLexicalTranscript(lexical: string): LexicalSegment[] {
  const segments: LexicalSegment[] = [];
  let cursor = 0;
  for (const match of lexical.matchAll(PAUSE_MARKER)) {
    const before = lexical.slice(cursor, match.index).trim();
    if (before) segments.push({ kind: "text", text: before });
    segments.push({ kind: "pause", seconds: Number(match[1]) });
    cursor = match.index + match[0].length;
  }
  const rest = lexical.slice(cursor).trim();
  if (rest) segments.push({ kind: "text", text: rest });
  return segments;
}
