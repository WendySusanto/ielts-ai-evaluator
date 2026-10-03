// Same setup as lexical.check.ts: `npm run check:notebook`.
import assert from "node:assert/strict";
import { cardFront, findPhrase, shuffle } from "./notebook.ts";

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

console.log("notebook: ok");
