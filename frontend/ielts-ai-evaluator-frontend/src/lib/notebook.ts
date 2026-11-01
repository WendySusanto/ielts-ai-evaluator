// Kept free of imports so `npm run check:notebook` can run it under plain Node, like lexical.ts.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` around the first case-insensitive `phrase` as [before, match, after]; \w* catches
 * inflections. ponytail: irregular forms ("took a toll") aren't found; callers show plain text. */
export function findPhrase(text: string, phrase: string): [string, string, string] | null {
  const trimmed = phrase.trim();
  if (!trimmed) return null;
  const match = new RegExp(`${escapeRegExp(trimmed)}\\w*`, "i").exec(text);
  if (!match) return null;
  return [
    text.slice(0, match.index),
    match[0],
    text.slice(match.index + match[0].length),
  ];
}

interface CardSource {
  word: string;
  meaning?: string | null;
  example?: string | null;
  replaces?: string | null;
}

/** Card front (the back shows the word): "upgrade" marks the weak word in the learner's sentence,
 * "cloze" blanks the word in its example, "word" just asks for its meaning. */
export type CardFront =
  | { kind: "upgrade"; sentence: string; parts: [string, string, string] | null; replaces: string }
  | { kind: "cloze"; parts: [string, string, string]; hint: string | null }
  | { kind: "word"; word: string };

export function cardFront(entry: CardSource): CardFront {
  if (entry.replaces && entry.example) {
    return {
      kind: "upgrade",
      sentence: entry.example,
      parts: findPhrase(entry.example, entry.replaces),
      replaces: entry.replaces,
    };
  }
  const parts = entry.example ? findPhrase(entry.example, entry.word) : null;
  if (parts) return { kind: "cloze", parts, hint: entry.meaning ?? null };
  return { kind: "word", word: entry.word };
}

/** Fisher–Yates; returns a new array. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

interface Scheduled {
  mastered: boolean;
  dueAt: string;
}

/** Words still being learned whose review has come round. */
export function dueEntries<T extends Scheduled>(entries: readonly T[], now: Date): T[] {
  return entries.filter((e) => !e.mastered && Date.parse(e.dueAt) <= now.getTime());
}

/** Whole days, rounded up, until the next word still being learned comes due; null if none is. */
export function daysUntilNextDue(entries: readonly Scheduled[], now: Date): number | null {
  const times = entries.filter((e) => !e.mastered).map((e) => Date.parse(e.dueAt));
  if (times.length === 0) return null;
  return Math.max(0, Math.ceil((Math.min(...times) - now.getTime()) / 86_400_000));
}

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

/** Reads text aloud with the browser's own voice — British English, as in the exam. */
export function speak(text: string) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  // One utterance per sentence: Chrome's online voices stop mid-utterance after ~15s, which
  // cut a band 7 sample answer off halfway. speak() queues, so the sentences play in order.
  const segments = new Intl.Segmenter("en", { granularity: "sentence" }).segment(text);
  for (const { segment } of segments) {
    const utterance = new SpeechSynthesisUtterance(segment);
    utterance.lang = "en-GB";
    window.speechSynthesis.speak(utterance);
  }
}
