# Notebook AI fill — design

## Context
Adding a word by hand means typing its meaning and an example yourself, and nothing stops a
misspelled or made-up word from entering the notebook. Browsers expose no dictionary API, so the
check needs a service. Gemini is already wired in, and one call can both validate the word and fill
the fields. Decided 2026-09-27: AI fill + native spellcheck. No autocomplete, no automatic check on
save.

## Backend
- `POST v2/notebook/suggest` `{ word }` → `WordSuggestion { isWord, suggestion?, meaning, example, level }`.
- `NotebookService.SuggestAsync(word, ct)`: word required and ≤100 characters (same validation as create).
  Calls `IGeminiStructuredClient` on the default `GeminiApiEndpoint` with `thinkingBudget: 0`.
- Schema and system prompt live in `DTOs/WordSuggestion.cs`, like `WritingFeedbackPrompts`:
  - British English, aimed at IELTS learners; phrases and collocations count as words.
  - A misspelled or non-existent word gets `isWord: false`, `suggestion` = the most likely intended
    word or null, and the other fields empty.
  - `meaning` ≤20 words, plain. `example` is one natural IELTS-topic sentence that contains the word
    (so the review card can blank it out). `level` is the approximate CEFR level.
- Rate limit `Notebook_Suggest` = 60/hour in `RateLimitMiddleware`.
- Usage is not recorded. The ceiling is a few hundred tokens × 60/hour per user; add a usage row
  if this spend ever needs to show on the admin list.

## Frontend (`EntryDialog`)
- `spellCheck` + `lang="en"` on Word, Meaning and Example: the browser underlines typos for free.
- "Fill with AI" button beside the Word label; disabled while Word is empty or a request is running.
  - Valid word: empty Meaning/Example fields are filled. If both are already filled, both are replaced (regenerate).
  - `isWord: false`: an inline notice under Word says it doesn't look like an English word. When
    there is a suggestion, a "Use “X”" button swaps the word in and fills again.
  - Failure: toast "Couldn't fill this right now — you can type it yourself."
- Level from the suggestion is sent on create only. Updates keep their current shape.

## Verification
- `NotebookServiceTests` with a fake Gemini client: valid word passes through, a misspelling
  returns its suggestion, a blank word is rejected before any call.
- `dotnet test`, `npm run build`, eslint on the touched files.
