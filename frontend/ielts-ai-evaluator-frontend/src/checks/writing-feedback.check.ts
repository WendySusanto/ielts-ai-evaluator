// Same setup as lexical.check.ts: `npm run check:writing-feedback`.
import assert from "node:assert/strict";
import { annotate } from "../lib/writing-feedback.ts";

// A match carries its error's index; the rest is unmarked.
assert.deepEqual(annotate("People is happy.", ["People is"]), [
  { text: "People is", error: 0 },
  { text: " happy." },
]);

// Whitespace may differ (Gemini tidies line breaks); the essay's own text is what's kept.
assert.deepEqual(annotate("I has\na cat.", ["has a"]), [
  { text: "I " },
  { text: "has\na", error: 0 },
  { text: " cat." },
]);

// The same quote twice: each error takes the next occurrence not yet claimed.
assert.deepEqual(annotate("he go. she go.", ["go", "go"]), [
  { text: "he " },
  { text: "go", error: 0 },
  { text: ". she " },
  { text: "go", error: 1 },
  { text: "." },
]);

// Overlap: the later quote is left unmarked (it still shows in the list), never nested.
assert.deepEqual(annotate("a very big city", ["very big", "big city"]), [
  { text: "a " },
  { text: "very big", error: 0 },
  { text: " city" },
]);

// A quote Gemini reworded is simply not marked; no text is lost.
assert.deepEqual(annotate("Fine text.", ["not here"]), [{ text: "Fine text." }]);

// Regex metacharacters are literal; blank quotes are ignored.
assert.deepEqual(annotate("costs (a lot)", ["(a lot)", "  "]), [
  { text: "costs " },
  { text: "(a lot)", error: 0 },
]);

// Marks come out in text order even when the errors are listed out of order.
assert.deepEqual(annotate("one two", ["two", "one"]), [
  { text: "one", error: 1 },
  { text: " " },
  { text: "two", error: 0 },
]);

console.log("writing-feedback: ok");
