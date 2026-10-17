// Same setup as lexical.check.ts: `npm run check:notebook`.
import assert from "node:assert/strict";
import { cardFront, daysUntilNextDue, dueEntries, findPhrase, shuffle } from "../lib/notebook.ts";

// Case-insensitive, and stretches over an inflection.
assert.deepEqual(findPhrase("It Exacerbates the problem.", "exacerbate"), [
  "It ",
  "Exacerbates",
  " the problem.",
]);
assert.equal(findPhrase("Nothing here.", "absent"), null);
assert.equal(findPhrase("Anything.", "  "), null);
// Regex metacharacters in the phrase are literal.
assert.deepEqual(findPhrase("costs (a lot)", "(a lot)"), ["costs ", "(a lot)", ""]);

// Saved from feedback: the learner's sentence with the weak word marked.
assert.deepEqual(
  cardFront({ word: "substantial", example: "The city grew very big.", replaces: "very big" }),
  {
    kind: "upgrade",
    sentence: "The city grew very big.",
    parts: ["The city grew ", "very big", "."],
    replaces: "very big",
  },
);
// Weak word not found verbatim: the sentence still shows, unmarked.
assert.equal(
  (cardFront({ word: "took a toll", example: "It hurt us.", replaces: "hurt a lot" }) as { parts: unknown }).parts,
  null,
);

// Manual word used in its example: blanked, meaning as the hint.
assert.deepEqual(
  cardFront({ word: "mitigate", meaning: "make less severe", example: "We must Mitigate risks." }),
  { kind: "cloze", parts: ["We must ", "Mitigate", " risks."], hint: "make less severe" },
);

// Manual word with no usable example: the word itself.
assert.deepEqual(cardFront({ word: "ubiquitous", meaning: "found everywhere" }), {
  kind: "word",
  word: "ubiquitous",
});
assert.deepEqual(cardFront({ word: "ubiquitous", example: "Phones are everywhere." }), {
  kind: "word",
  word: "ubiquitous",
});

// shuffle keeps every item and leaves the input alone.
const input = [1, 2, 3, 4, 5];
assert.deepEqual([...shuffle(input)].sort(), [1, 2, 3, 4, 5]);
assert.deepEqual(input, [1, 2, 3, 4, 5]);

// Review schedule: only unmastered words whose time has come; the wait rounds up to whole days.
const now = new Date("2026-10-18T12:00:00Z");
const words = [
  { id: "due", mastered: false, dueAt: "2026-10-18T11:00:00Z" },
  { id: "now", mastered: false, dueAt: "2026-10-18T12:00:00Z" },
  { id: "later", mastered: false, dueAt: "2026-10-20T06:00:00Z" },
  { id: "mastered", mastered: true, dueAt: "2026-10-01T00:00:00Z" },
];
assert.deepEqual(dueEntries(words, now).map((w) => w.id), ["due", "now"]);
assert.equal(daysUntilNextDue(words.slice(2), now), 2); // 1.75 days away
assert.equal(daysUntilNextDue([words[3]], now), null); // nothing left to learn

console.log("notebook: ok");
