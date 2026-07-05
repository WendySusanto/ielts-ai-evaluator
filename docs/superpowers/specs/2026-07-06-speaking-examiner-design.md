# Conversational Speaking Examiner — Design

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Sub-project 3 of 5 (Security → UI redesign → Speaking examiner → Writing detail → Refactor)

## Context

Current speaking flow is one-shot: browser Web Speech API captures a transcript, user submits, Gemini scores it. Target: a turn-based conversation with an AI IELTS examiner — Azure Cognitive Services Speech for STT + neural TTS, Gemini as the examiner brain, restricted to IELTS test conduct. User picks a part (1, 2, or 3), matching the existing `/speaking/:part/:taskId` routes and SpeakingPrompts bank.

## Decisions

- **Session shape:** real IELTS structure, user picks Part 1, 2, or 3. No full mock test, no free-flow mode.
- **Turn-taking:** manual "Done" button ends the user's turn. No silence detection, no push-to-talk.
- **Azure Speech:** user will create an F0 free-tier resource (5h STT + 0.5M TTS chars/month). Key lives backend-side only.
- **Examiner voice:** Azure neural TTS, `en-GB-RyanNeural` (configurable via settings).

## Architecture: turn-based, stateless backend

No websockets/streaming — unsuited to Functions Consumption, and unnecessary with manual turn-ending.

1. Browser fetches a short-lived Azure Speech auth token from new endpoint `GET /api/speech/token` (backend exchanges the Speech key; key never reaches the client).
2. Examiner question is spoken in-browser via Azure TTS and shown as text.
3. User answers; Azure STT (via `microsoft-cognitiveservices-speech-sdk` npm package) transcribes live on screen. User taps **Done**.
4. Frontend posts conversation state (part, prompt id, all Q/A turns, latest answer) to new endpoint `POST /api/speaking/examiner-turn`. Gemini (existing `GeminiApiClient`) returns the next examiner question or a part-complete signal, as structured JSON.
5. On completion, the full Q/A transcript goes to the existing `EvaluateSpeakingAsync` → stored `SpeakingEvaluation` → existing SpeakingFeedback page.

Conversation state lives client-side; no session table, no server-side session state.

## Part behavior (driven by existing SpeakingPrompts bank)

- **Part 1:** 4–6 interview questions with natural follow-ups based on the user's answers.
- **Part 2:** cue card shown and read aloud → 60s prep countdown → 2-minute talk timer (examiner never interrupts; "Finish early" button) → one rounding-off question.
- **Part 3:** 4–6 discussion questions Gemini generates dynamically, deepening on the user's answers.

## Guardrails

- Examiner system prompt locks Gemini into IELTS-examiner conduct: redirects off-topic answers ("Let's return to the question…"), never breaks character, refuses non-IELTS requests (prevents use as a general chatbot, resists prompt injection from the spoken transcript).
- Server-side cap: max 20 examiner turns per session (returns part-complete when hit) to bound Gemini cost.
- The daily speaking evaluation quota (security spec) applies to the final evaluation call.
- `/api/speech/token` and `/api/speaking/examiner-turn` sit behind the existing Firebase auth middleware like everything else.

## Fallbacks & error handling

- No mic permission or STT failure → typed answer textarea still works.
- TTS failure → question displays as text only.
- Speech token expiry (~10 min) → frontend refreshes token transparently before STT/TTS calls.
- Old Web Speech hook (`use-speech-recognition.ts`) is deleted once replaced.

## Configuration

New settings (local.settings.json / Azure App Settings): `AzureSpeechKey`, `AzureSpeechRegion`, `ExaminerVoice` (default `en-GB-RyanNeural`).

## UI

SpeakingPractice becomes a "call" experience using the new design system: examiner state indicator (Speaking / Your turn / Thinking), live transcript panel, Done button, Part 2 prep/talk timers and cue card.

## Testing

- Backend: unit check for examiner-turn request validation and the 20-turn cap; guardrail prompt verified manually with off-topic input.
- Frontend: manual end-to-end run of each part (mic and typed fallback), token refresh path exercised by a long session.

## Out of scope (deferred)

- Azure Pronunciation Assessment (real accuracy/fluency/prosody scores merged into the evaluation) — natural phase 2.
- Full mock test mode (Parts 1→2→3 in one sitting).
- Storing per-turn audio recordings.
