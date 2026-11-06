// Same setup as lexical.check.ts: `npm run check:speaking-feedback`.
import assert from "node:assert/strict";
import { matchAnswersToTurns, groupByCategory, questionProgress } from "../lib/speaking-feedback.ts";

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

// The question counter counts against the prompt's script, not the server's hard cap of 8 — a
// four-question Part 1 used to read 4/8 and then jump to 8/8 when the examiner wrapped up.
const script = "Where is your hometown?\nHave you always lived there?\n\nWhat do you like most?\nHas it changed?";
const examiner = (n: number) => Array.from({ length: n }, () => ({ role: "examiner" }));
assert.deepEqual(questionProgress("Part1", script, examiner(1), false), { asked: 1, total: 4 });
assert.deepEqual(questionProgress("Part1", script, examiner(4), false), { asked: 4, total: 4 });
// Done: the examiner's fifth line is its closing remark, not a question.
assert.deepEqual(questionProgress("Part1", script, examiner(5), true), { asked: 4, total: 4 });
// A follow-up is an extra examiner turn; the count never runs past the total.
assert.deepEqual(questionProgress("Part3", script, examiner(6), false), { asked: 4, total: 4 });
// Part 2 is the cue card plus one rounding-off question.
assert.deepEqual(questionProgress("Part2", "bullet one\nbullet two\nbullet three", examiner(1), false), {
  asked: 1,
  total: 2,
});
// No script: the examiner is told to ask 4-6 of its own.
assert.deepEqual(questionProgress("Part1", undefined, examiner(2), false), { asked: 2, total: 5 });
// A script longer than the server's cap is cut off at the cap.
assert.deepEqual(questionProgress("Part3", "q\n".repeat(10), examiner(3), false), { asked: 3, total: 8 });
