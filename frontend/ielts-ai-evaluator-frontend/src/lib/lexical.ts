// Kept out of use-speech.ts so it can be exercised without pulling in React and the Azure SDK:
// `npm run check:lexical`. Pure arithmetic, no imports.

// Azure reports word offsets and durations in 100-ns ticks.
const TICKS_PER_MS = 10_000;
// ponytail: 1s is a hand-picked line between "natural beat" and "hesitation an examiner notices".
// Tune against real marked sessions before trusting the band it feeds.
const PAUSE_THRESHOLD_MS = 1000;

/** One recognized word with its absolute position in the session's audio. Azure rebases each
 * segment's offsets onto the whole stream, so gaps *between* segments fall out of the same
 * arithmetic as gaps within one — and those are the long silences that matter most. */
export interface TimedWord {
  Word: string;
  Offset: number;
  Duration: number;
}

/** Renders one candidate turn as Azure's raw lexical text with [pause N.Ns] markers inserted
 * wherever two words sit at least PAUSE_THRESHOLD_MS apart. A recognizer's display text is
 * auto-punctuated, with false starts and repetitions tidied away — which quietly flatters the
 * candidate's grammar and erases every hesitation. This is what they actually said, and where
 * they stopped. It travels alongside the display text so the model can compare the two. */
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

/** Seconds from the first word's start to the last word's end — pauses inside the answer count,
 * the thinking time before its first word does not. The server divides words by this to get the
 * speech rate, so it stays a raw measurement here. 0 when nothing was recognized. */
export function speakingSeconds(words: TimedWord[]): number {
  if (words.length === 0) return 0;
  const last = words[words.length - 1];
  return (last.Offset + last.Duration - words[0].Offset) / TICKS_PER_MS / 1000;
}

// ponytail: duration alone decides the colour. Where a pause falls matters more to an examiner
// than how long it runs — a beat before a new idea is fine, the same beat mid-clause is not —
// but that needs the pause aligned to the display text's clause boundaries. Upgrade to that if
// the colours start disagreeing with the band.
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
