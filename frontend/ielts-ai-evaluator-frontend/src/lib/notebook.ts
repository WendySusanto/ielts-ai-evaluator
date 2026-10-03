// Kept free of imports so `npm run check:notebook` can run it under plain Node, like lexical.ts.

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` around the first case-insensitive occurrence of `phrase` as [before, match,
 * after]. The trailing \w* stretches the match over an inflection ("exacerbate" → "exacerbates").
 * ponytail: irregular forms ("take a toll" → "took a toll") are not found; callers fall back to
 * the plain text. Match on a lemma list if that happens often enough to matter. */
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

/** What the front of a review card asks. The back always shows the word itself.
 * - upgrade: saved from feedback — the learner's own sentence with the weak word marked.
 * - cloze: a manual word whose example contains it — the example with the word blanked.
 * - word: nothing to quiz from — the word, to recall its meaning. */
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

export const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;

/** Reads a word aloud with the browser's own voice — British English, as in the exam. */
export function speak(text: string) {
  if (!canSpeak) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-GB";
  window.speechSynthesis.speak(utterance);
}
