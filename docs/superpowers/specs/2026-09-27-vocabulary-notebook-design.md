# Vocabulary Notebook — design & plan

## Context
Learners get vocabulary upgrades in every Writing/Speaking feedback, but they vanish into history.
A per-user notebook lets them collect words (manually or with one click from feedback), review them
with flashcards, and hear pronunciation. Decided in brainstorming (2026-09-27):
- v1 = manual add / edit / delete, save-from-feedback (vocab upgrades only), search & filter,
  flashcard review with "mastered", TTS.
- Storage: new Postgres table (per account, synced across devices). Not localStorage.
- Out of scope: saving arbitrary selected text, saving Errors, SRS, AI usage tracking, export.


## Backend

**Entity** `backend/IELTS.AI.Evaluator.Data/Models/NotebookEntry.cs` (`: BaseEntity`, shape like `ExaminerTurnUsage.cs`):
`NotebookEntryId`, `UserId` + `User`, `Word` (req, ≤100), `Meaning?` (≤500), `Example?` (≤500),
`Replaces?` (≤100), `Level?` (≤10), `Source` ("Manual"|"Writing"|"Speaking"), `SourceId? Guid`, `Mastered bool`.
- `EvaluatorDbContext.cs`: `DbSet<NotebookEntry> NotebookEntries`; config block like `ExaminerTurnUsage`
  (key, FK cascade, index `(UserId, CreatedAt)`).
- Migration: `dotnet ef migrations add AddNotebookEntry` in the Data project.
- Hard delete (no `IsDeleted` use) so a deleted word can be re-added cleanly.

**Service** `backend/IELTS.AI.Evaluator.Functions/Services/NotebookService.cs` (pattern: `WritingPromptService.cs`):
- records `NotebookCreateRequest(Word, Meaning?, Example?, Replaces?, Level?, Source, SourceId?)`,
  `NotebookUpdateRequest(Word, Meaning?, Example?, Mastered)`, `NotebookEntryDto(... all fields, CreatedAt)`.
- `ListAsync(userId)` — newest first.
- `CreateAsync(userId, req)` — trim + validate (Word required, lengths, Source in set → `ValidationException`);
  **idempotent**: if the user already has the word (case-insensitive `ToLower()` compare) return that entry.
- `UpdateAsync(userId, id, req)` — `NotFoundException` if missing/not owned; renaming to another existing
  word → `ValidationException("already in your notebook")`.
- `DeleteAsync(userId, id)` — `NotFoundException` if missing/not owned.
- Register in `Program.cs` next to other `AddScoped<I…Service>` lines.

**Functions** `backend/IELTS.AI.Evaluator.Functions/Functions/Notebook.cs` (pattern: `WritingV2.cs`, userId via
`context.GetUserId()!.Value`, `JsonSerializerDefaults.Web`): `GET/POST v2/notebook`, `PUT/DELETE v2/notebook/{id:guid}`.
PUT (not PATCH) because `useApi.mutate` only supports POST/PUT/DELETE.

## Frontend (`frontend/ielts-ai-evaluator-frontend/src`)

- `types/notebook.ts` — `NotebookEntry`, `NotebookSource`.
- `lib/notebook.ts` — pure helpers, no imports:
  - `cardFaces(entry)` → `{ front, back }` data:
    1. has `replaces` + `example`: front = example with `replaces` highlighted + "Stronger word for “X”?"; back = word.
    2. manual, example contains word (case-insensitive): front = example with word → `_____` + meaning as hint; back = word.
    3. else: front = word; back = meaning / example.
  - `shuffle(arr)` (Fisher–Yates), `speak(word)` (`speechSynthesis`, `lang="en-GB"`, no-op if unsupported).
  - Move `escapeRegExp` here from `components/feedback/VocabularyCard.tsx` and import it back there.
- `lib/notebook.check.ts` + `package.json` script `check:notebook` (same style as `check:lexical`) — asserts the 3
  `cardFaces` branches and case-insensitive blanking.
- `hooks/use-notebook.ts` — wraps `useApi<NotebookEntry[]>("/api/v2/notebook")`; exposes `entries`,
  `isSaved(word)` (lower-case Set), `save(req)`, `update(id, req)`, `remove(entry)` (toast with **Undo** → re-POST),
  errors via `lib/friendly-error.ts` + Sonner toast. Updates local list after each mutation (no refetch).
- `pages/Notebook.tsx` — route `/notebook` in `App.tsx` (wrapped in `PrivateRoute`), sidebar item
  "Notebook" (`BookMarked`) after Feedback History in `components/AppSidebar.tsx`.
  - Toolbar: search `Input`, source `Select` (All/Writing/Speaking/Manual), `Tabs` Learning/Mastered,
    buttons "Add word", "Review" (disabled when no learning words).
  - Entry row: word, level `Badge`, 🔊 button, "instead of “X”", example, meaning, source link
    (`/feedback/{id}` or `/speaking-feedback/{id}` + `getRelativeTime`), mastered `Checkbox`, Edit, Delete.
  - Empty state styled like FeedbackHistory's dashed box; loading via `TableSkeleton`/`Skeleton`; error via `ErrorPage`.
- `components/notebook/EntryDialog.tsx` — one `Dialog` for add + edit: Word (`Input`), Meaning, Example (`Textarea`).
- `components/notebook/ReviewDialog.tsx` — deck = shuffled non-mastered entries; show front → "Show answer" →
  back + 🔊 → "Still learning" / "Mastered" (PUT mastered=true); end screen with counts + "Review again".
- `components/notebook/SaveWordButton.tsx` — bookmark icon button (filled when saved; click toggles save/remove),
  `aria-pressed`, `aria-label`.
  - `pages/DetailedFeedback.tsx` vocab list: `{ word: v.upgrade, replaces: v.original, example: v.context, source: "Writing", sourceId: essayId }`.
  - `components/feedback/VocabularyCard.tsx`: `{ word: item.phrase, replaces: item.replaces, example: item.original, level: item.level, source: "Speaking", sourceId }` — pass `useNotebook` result + session id down from `pages/SpeakingFeedback.tsx`.

## Verification
- `dotnet test backend/IELTS.AI.Evaluator.sln` with new `backend/IELTS.AI.Evaluator.Tests/NotebookServiceTests.cs`
  (in-memory DB like `PromptServiceTests.cs`): create; duplicate word (different case) returns same entry;
  validation errors; update; rename-to-existing rejected; update/delete other user's entry → NotFound; list only own.
- `npm run check:notebook`, `npm run lint`, `npm run build` in the frontend.
- Manual (run skill): apply migration, open a Writing + Speaking feedback → bookmark a word (icon fills, toast),
  unbookmark; `/notebook` shows it with context + source link; add manual word with example; edit; search/filter;
  delete + Undo; Review deck shows all three card types, "Mastered" moves word to Mastered tab; 🔊 speaks.
