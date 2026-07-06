# When IELTS? — v2 Requirements & Architecture

**Date:** 2026-07-06
**Status:** Draft for review
**Supersedes:** `2026-07-06-ui-redesign-design.md` and `2026-07-06-speaking-examiner-design.md` (their decisions are folded in here and amended; the security work from `2026-07-06-security-hardening-design.md` is already shipped and carries forward).

## 1. Vision

Rebuild the IELTS AI Evaluator as **"When IELTS?"** (tagline: LEARN · SPEAK · WRITE) — a production-ready v2. Free for all users at launch, with monetization placeholders (plan field, quotas, premium gates) already wired so a paid tier can be switched on later. The speaking and writing feedback must be detailed enough that people would *want* to subscribe.

## 2. Architecture (decided)

| Layer | v2 choice |
|---|---|
| Frontend | React 19 + Vite + Tailwind 4 + shadcn/ui (kept), lucide SVG icons only |
| Auth | Firebase Authentication (kept), custom-claims-based middleware (rewritten) |
| Backend | .NET 8 isolated Azure Functions (kept) |
| Database | PostgreSQL + EF Core — **fresh v2 schema, all existing migrations dropped, data wiped** |
| AI — language | Gemini via REST, **structured JSON output** (`responseMimeType: application/json` + `responseSchema`) |
| AI — speech | Azure Cognitive Services Speech (F0): STT, neural TTS, **Pronunciation Assessment** |

## 3. Auth & middleware v2

Problem today: the middleware hits Postgres on **every** request (get-or-create user, `LastLogin` write, `SetCustomUserClaimsAsync`), and is ~200 lines.

v2 design — token-only middleware:

- **`POST /api/auth/sync`** — the only endpoint that touches the DB for identity. Called by the frontend once after Firebase sign-in (and after profile changes). It: verifies the token, gets-or-creates the `users` row, updates `last_login`, sets Firebase custom claims `{ userId, role }` when they differ, and returns the profile. Frontend force-refreshes its ID token afterward so claims are present.
- **Middleware** (target ≤ 60 lines): verify the Bearer ID token via Firebase Admin SDK (local JWKS validation — no network, no DB), read `userId`/`role` claims into `FunctionContext.Items`, 401 on failure. If the `userId` claim is missing (first login, sync not yet run), 403 with `{ message: "Account not initialised. Call /api/auth/sync." }` — except for `/api/auth/sync` itself.
- Role comes from the claim; DB remains the source of truth updated at sync time. Plan changes take effect on next token refresh (acceptable at this scale).

## 4. API contract v2

- **Plain HTTP semantics.** 2xx → the DTO itself, no envelope. Errors → correct status (400/401/403/404/429/500) with body `{ "message": string }`. No stack traces, no config values, no success-flag string matching.
- Routes stay kebab-case under `/api/`. Every endpoint requires auth (middleware) except none — admin endpoints additionally check `role == Admin`.
- **Frontend API layer:** delete `types/ApiResponse.ts` and the double-unwrap pattern. One small typed client on top of the existing axios instance: `api.get<T>(url)`, `api.post<T>(url, body)` → returns `T` or throws `ApiError { status, message }`. Errors surface via a single interceptor (toast + optional redirect on 401). `use-fetch` hook is rewritten on top of it. No new dependencies.

## 5. Database v2 (fresh start)

Drop the `Migrations/` folder and the existing database; create one clean initial migration. Soft-delete (`IsDeleted`) is dropped except where noted; prompt visibility uses `is_active`.

Tables (EF Core entities; snake_case in Postgres via Npgsql naming or default EF conventions — pick one and apply consistently):

- **users** — `user_id` (PK, guid), `firebase_uid` (unique), `email`, `full_name`, `plan` (`Free` | `Premium` | `Admin` — monetization placeholder), `ielts_target_score` (decimal, nullable), `target_test_date` (nullable), `last_login`, `created_at`, `updated_at`.
- **writing_prompts** — `writing_prompt_id` (PK), `task_type` (`Task1` | `Task2`), `topic`, `question_text`, `image_description` (nullable, Task 1 charts), `is_active`, timestamps.
- **speaking_prompts** — `speaking_prompt_id` (PK), `part` (`Part1` | `Part2` | `Part3`), `topic`, `question_text`, `cue_points` (nullable, Part 2 card), `is_active`, timestamps.
- **writing_evaluations** — `writing_evaluation_id` (PK), `user_id` (FK), `writing_prompt_id` (FK), `essay_text`, `word_count`, `overall_band` (decimal), `feedback` (**jsonb** — the parsed structured Gemini result, not the raw HTTP response), `ai_model`, `prompt_tokens`, `completion_tokens`, `created_at`.
- **speaking_sessions** — `speaking_session_id` (PK), `user_id` (FK), `speaking_prompt_id` (FK), `part`, `turns` (**jsonb** — ordered `{ role: examiner|candidate, text }[]`), `overall_band` (decimal), `feedback` (**jsonb** — structured Gemini result across the four criteria), `pronunciation` (**jsonb** — Azure Pronunciation Assessment result: overall scores + per-word detail), `ai_model`, `prompt_tokens`, `completion_tokens`, `created_at`.

Indexes: FKs, plus `(user_id, created_at)` on both evaluation tables (history queries + the daily-quota COUNT).

No `RawJson`-with-markdown-fences anywhere: structured output is stored as real jsonb.

## 6. Writing v2

Functionality unchanged (choose prompt → write → submit → detailed feedback), code and data flow rebuilt:

- **Gemini structured output:** request `responseMimeType: "application/json"` with an explicit `responseSchema` describing the full feedback shape. No markdown-fence stripping, no `Replace("```json", ...)`.
- **Feedback schema** (the "very detailed examination"): per-criterion (Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy): band, sub-scores with one-line justification, concrete quoted examples from the essay, and improvement actions; plus overall band, an improved-version excerpt, error list (quote → correction → rule), and vocabulary upgrades.
- Service code restructured: thin Function (HTTP concerns) → service (orchestration) → GeminiClient (transport + schema). Guards from the security work (length cap, daily quota, ownership) carry forward.

## 7. Speaking v2 — examiner + full assessment

Session flow (unchanged from the approved examiner spec): user picks Part 1/2/3 → turn-based conversation — Azure TTS speaks the examiner question, Azure STT transcribes the candidate, manual **Done** ends a turn, Gemini (structured output) produces the next question or ends the part. Stateless backend; conversation state client-side; ~20-turn server cap; examiner system prompt locked to IELTS conduct (redirects off-topic, refuses non-IELTS use).

**Assessment — all four IELTS criteria, now including real pronunciation:**

- During each candidate turn the frontend runs Azure **Pronunciation Assessment** alongside STT (same SDK session): accuracy, fluency, prosody, completeness + per-word/phoneme scores. Per-turn results are accumulated client-side and submitted with the final transcript.
- Final evaluation merges two sources into one `feedback` document:
  - **Gemini** (from the transcript): Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy — band + justification + quoted examples + improvement actions each.
  - **Azure PA** (from the audio): Pronunciation band mapped from PA scores, plus mispronounced-word list with phoneme-level detail.
- Overall band = IELTS-style average of the four criteria (rounded to nearest 0.5).
- New endpoints: `GET /api/speech/token` (short-lived Azure token; key stays server-side), `POST /api/speaking/examiner-turn`, `POST /api/speaking/sessions` (final submission → evaluation), `GET /api/speaking/sessions` / `/{id}` (history/detail, ownership-checked).
- Config: `AzureSpeechKey`, `AzureSpeechRegion`, `ExaminerVoice` (default `en-GB-RyanNeural`).
- New dependency: `microsoft-cognitiveservices-speech-sdk` (frontend). Fallbacks: typed answer when mic/STT unavailable (no PA data → pronunciation section shows "not assessed"); text display when TTS fails.

## 8. Design system & UI v2

Applies ui-ux-pro-max rules throughout. Reference mockups define the vibe; not pixel-faithful.

- **Brand:** "When IELTS?" + LEARN · SPEAK · WRITE. Logo mark as inline SVG.
- **Palette (flat — no gradients anywhere):** teal primary (~oklch 0.55 0.09 195 range, tuned for 4.5:1 on white), warm cream app background, white cards, orange accent for tips/highlights, charcoal text. Dark mode designed in the same pass (desaturated tonal variants, not inversions; contrast verified independently). Semantic tokens only — components never use raw hex/oklch.
- **`index.css` rebuilt:** the full shadcn variable set redefined for light + dark with the new palette; delete the ad-hoc extras (`--card-background-blue-light` family, `--muted-foreground-bold`, `--badge-background-indigo`, duplicate `--secondary` definitions). Keep the standard shadcn token names so `components/ui/*` keep working.
- **Delete `src/styles/gradients.ts`** and every usage.
- **Icons:** lucide SVG only. No emoji anywhere in the UI.
- Shape: ~1rem card radius, pill buttons, soft 1px borders, one subtle elevation level. Type: Plus Jakarta Sans via `@fontsource` (self-hosted), weights 400/500/600/700; tabular numerals for band scores.
- Accessibility: 4.5:1 body text both modes, visible focus rings, 44px touch targets, labels on all inputs, `prefers-reduced-motion` respected. Micro-interactions 150–300ms, transform/opacity only.
- **Every screen restyled**, with special attention to: **Dashboard** (stat tiles with SVG icons, band-progress toward `ielts_target_score`, recent activity — no gradient hero) and **Admin** (proper data table: sortable columns, prompt CRUD forms with validation and empty states — currently the worst screen). Skeletons mirror the new layouts.

## 9. Security & monetization posture (carry-forward)

Already shipped and kept in v2: CORS allowlist, admin role checks, ownership checks, daily quotas (Free 10 writing + 10 speaking/day — this IS the monetization placeholder; Premium/Admin unlimited), input caps, no secrets in tracked files, 429/400 semantics. New v2 surface follows the same rules: examiner-turn capped, speech token endpoint auth-gated, quotas enforced before paid AI calls.

## 10. Explicitly out of scope for v2

- Payments/billing integration (placeholder only: `plan` field + quota gates + Premium page).
- Full mock test mode (Parts 1→2→3 chained).
- Streak counter, global search, notifications (mockup decorations, not features).
- Storing candidate audio recordings.

## 11. Build order (decided)

Foundations first — each phase produces working software:

1. **Backend core:** v2 schema + fresh migration; auth `/api/auth/sync` + slim middleware; API contract v2 across all existing endpoints; Gemini structured output for writing. (Biggest unblocking layer.)
2. **Frontend core:** typed API client (replace ApiResponse/use-fetch); theme rebuild (`index.css`, delete gradients.ts, fonts, tokens); app shell (sidebar/header/auth flow) on the new design system.
3. **Writing v2 UI** + detailed feedback screens.
4. **Speaking v2:** speech token endpoint + examiner-turn backend, then the call UI with STT/TTS/PA, then merged evaluation + feedback screens.
5. **Dashboard + Admin + remaining screens** polish, light/dark walkthrough, production checklist (CORS prod origin, App Settings, `npm run build` + full test suite).

## 12. Testing bar

- Backend: existing guard/ownership test style continues — every new non-trivial rule (auth sync claim logic, quota on new endpoints, examiner turn cap, PA/Gemini merge) gets a focused test. Suite must stay green through every phase.
- Frontend: `tsc -b && vite build` clean per phase; manual route walkthrough light + dark before a phase closes.
