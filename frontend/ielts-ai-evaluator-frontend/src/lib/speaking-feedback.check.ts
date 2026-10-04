// Same setup as lexical.check.ts: `npm run check:speaking-feedback`.
import assert from "node:assert/strict";
import { matchAnswersToTurns, groupByCategory } from "./speaking-feedback.ts";

// Answers are numbered by candidate turn, skipping examiner turns — the numbers SpeakingService
// writes into the transcript it sends to Gemini.
const turns = [
  { role: "examiner" },
  { role: "candidate" },
  { role: "examiner" },
  { role: "candidate" },
];
assert.deepEqual(
  matchAnswersToTurns(turns, [
    { answer: 2, comment: "second" },
    { answer: 1, comment: "first" },
  ]).map((a) => a?.comment),
  [undefined, "first", undefined, "second"],
);
// Sessions from before schema v2 have no answers at all.
assert.deepEqual(matchAnswersToTurns(turns, null), [undefined, undefined, undefined, undefined]);
// A missing entry leaves only that answer without feedback.
assert.deepEqual(
  matchAnswersToTurns(turns, [{ answer: 2, comment: "second" }]).map((a) => a?.comment),
  [undefined, undefined, undefined, "second"],
);
// Recordings are matched the same way: anything carrying an answer number.
assert.deepEqual(
  matchAnswersToTurns(turns, [{ answer: 2, url: "b" }]).map((a) => a?.url),
  [undefined, undefined, undefined, "b"],
);

// Biggest group first; equal groups keep Gemini's (most impactful first) order; spelling normalised.
assert.deepEqual(
  groupByCategory([
    { category: "article", original: "a" },
    { category: "Tense", original: "b" },
    { category: "tense ", original: "c" },
    { category: "preposition", original: "d" },
  ]).map(([category, items]) => [category, items.map((e) => e.original)]),
  [
    ["tense", ["b", "c"]],
    ["article", ["a"]],
    ["preposition", ["d"]],
  ],
);
