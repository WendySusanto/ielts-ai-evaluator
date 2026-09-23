// ponytail: no test runner in this repo, and one pure function does not justify adding one.
// Node 22 strips the types and runs this as-is: `npm run check:lexical`.
import assert from "node:assert/strict";
import {
  buildLexicalTranscript,
  parseLexicalTranscript,
  speakingSeconds,
  type TimedWord,
} from "./lexical.ts";

const TICKS_PER_MS = 10_000;
const w = (Word: string, startMs: number, durMs: number): TimedWord => ({
  Word,
  Offset: startMs * TICKS_PER_MS,
  Duration: durMs * TICKS_PER_MS,
});

// Back-to-back words: nothing to mark.
assert.equal(buildLexicalTranscript([w("i", 0, 200), w("come", 200, 200)]), "i come");

// Exactly at the threshold counts as a pause; a millisecond under does not.
assert.equal(buildLexicalTranscript([w("i", 0, 200), w("come", 1200, 200)]), "i [pause 1.0s] come");
assert.equal(buildLexicalTranscript([w("i", 0, 200), w("come", 1199, 200)]), "i come");

// The gap is measured from the END of the previous word: a long word is speech, not silence.
assert.equal(buildLexicalTranscript([w("i", 0, 3000), w("come", 3500, 200)]), "i come");

// Offsets are absolute across segments, so the silence Azure ended a phrase on is measured
// the same way as a hesitation inside one. This is the case the whole feature exists for.
assert.equal(
  buildLexicalTranscript([w("a", 0, 200), w("b", 200, 200), w("c", 3800, 200)]),
  "a b [pause 3.4s] c",
);

// Overlapping timings (the recognizer does emit them) must never produce a negative pause.
assert.equal(buildLexicalTranscript([w("a", 0, 500), w("b", 300, 200)]), "a b");

assert.equal(buildLexicalTranscript([]), "");

// The UI draws pauses instead of printing them, so the parser has to agree with the builder
// about the marker format — that is the whole reason both live in this file.
assert.deepEqual(
  parseLexicalTranscript(buildLexicalTranscript([w("a", 0, 200), w("b", 3800, 200)])),
  [
    { kind: "text", text: "a" },
    { kind: "pause", seconds: 3.6 },
    { kind: "text", text: "b" },
  ],
);

// No markers at all is the common case (a fluent answer), and must not become a pause.
assert.deepEqual(parseLexicalTranscript("i come from a small town"), [
  { kind: "text", text: "i come from a small town" },
]);

// A marker at either end leaves no empty text segment behind to render as a stray space.
assert.deepEqual(parseLexicalTranscript("[pause 1.5s] well"), [
  { kind: "pause", seconds: 1.5 },
  { kind: "text", text: "well" },
]);
assert.deepEqual(parseLexicalTranscript("well [pause 1.5s]"), [
  { kind: "text", text: "well" },
  { kind: "pause", seconds: 1.5 },
]);

// Back-to-back markers can't happen from the builder, but the parser must not drop one.
assert.deepEqual(parseLexicalTranscript("[pause 1.0s] [pause 2.0s]"), [
  { kind: "pause", seconds: 1 },
  { kind: "pause", seconds: 2 },
]);

assert.deepEqual(parseLexicalTranscript(""), []);

// Speaking time runs first-word-start to last-word-end: the 3s pause inside counts, the
// 5s of thinking before the first word does not.
assert.equal(speakingSeconds([w("a", 5000, 500), w("b", 8500, 500)]), 4);
assert.equal(speakingSeconds([w("a", 1000, 400)]), 0.4);
assert.equal(speakingSeconds([]), 0);

console.log("lexical: ok");
