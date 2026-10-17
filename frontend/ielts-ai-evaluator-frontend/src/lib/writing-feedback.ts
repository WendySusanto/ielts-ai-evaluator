// Kept free of imports so `npm run check:writing-feedback` can run it under plain Node, like lexical.ts.

export interface Segment {
  text: string;
  /** Index of the quote this stretch matches; absent for unmarked text. */
  error?: number;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` into unmarked stretches and stretches matching each quote. A quote matches
 * verbatim except for whitespace, because Gemini tidies line breaks and double spaces. A quote that
 * occurs more than once takes the first occurrence no earlier quote has claimed. One that is missing,
 * or that only overlaps claimed text, is left unmarked; the caller still lists it. */
export function annotate(text: string, quotes: readonly string[]): Segment[] {
  const claimed: { start: number; end: number; error: number }[] = [];
  quotes.forEach((quote, error) => {
    const words = quote.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return;
    const re = new RegExp(words.map(escapeRegExp).join("\\s+"), "g");
    for (let m = re.exec(text); m; m = re.exec(text)) {
      const start = m.index;
      const end = start + m[0].length;
      if (claimed.every((c) => end <= c.start || start >= c.end)) {
        claimed.push({ start, end, error });
        return;
      }
    }
  });

  claimed.sort((a, b) => a.start - b.start);
  const segments: Segment[] = [];
  let at = 0;
  for (const c of claimed) {
    if (c.start > at) segments.push({ text: text.slice(at, c.start) });
    segments.push({ text: text.slice(c.start, c.end), error: c.error });
    at = c.end;
  }
  if (at < text.length) segments.push({ text: text.slice(at) });
  return segments;
}
