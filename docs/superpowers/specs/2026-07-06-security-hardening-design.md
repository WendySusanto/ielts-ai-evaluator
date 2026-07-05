# Security Hardening — Design

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Sub-project 1 of 5 (Security → UI redesign → Speaking examiner → Writing detail → Refactor)

## Context

IELTS AI Evaluator: React frontend + .NET 8 isolated Azure Functions backend (Consumption plan, small user base), Postgres via EF Core, Firebase auth via custom middleware, Gemini API for evaluations. The expensive resource to protect is the Gemini evaluation calls; everything else is cheap CRUD behind Firebase auth.

## Changes

### 1. Secrets (already applied)

- Live Gemini API key and Firebase service-account JSON were sitting uncommitted in the tracked `appsettings.json`. Reverted; the file now holds only the local dev DB string.
- Real values live only in the gitignored `local.settings.json` (local dev) and Azure App Settings (production).
- **User action:** rotate the Gemini API key (AI Studio) and the Firebase service-account key `fe6b360a...` (Firebase Console / GCP IAM), since both were exposed.

### 2. Delete `DiagnoseConfig.cs`

Debug endpoint that returns the DB connection string to any authenticated caller. Delete outright; no replacement.

### 3. CORS allowlist

Replace `AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().AllowCredentials()` in `Program.cs` (an invalid combination browsers reject) with a config-driven allowlist:

- `AllowedOrigins` setting, comma-separated.
- Default/dev value: `http://localhost:5173`.
- Production placeholder documented for deploy time: `https://your-production-domain.example` added to Azure App Settings.

### 4. Rate limiting — daily quota, Postgres-backed

Applied only to the two Gemini-calling endpoints (writing evaluation, speaking evaluation).

- Before calling Gemini, `COUNT` today's rows in the relevant evaluations table for the current `UserId` (tables already carry `UserId` + timestamp — no new table, no reset job, accurate across function instances).
- Free plan: **10 writing + 10 speaking evaluations per UTC day**, configurable via settings (`DailyWritingQuota`, `DailySpeakingQuota`).
- Premium and Admin plans: unlimited (skip the check).
- Over quota → `429` with a friendly JSON message the frontend can surface next to the "Upgrade" card.

Alternatives considered and rejected:
- `WritingQuotaUsed`/`SpeakingQuotaUsed` counter columns on `User` — needs reset logic (timer or lazy reset); more moving parts for the same result.
- Azure API Management — cost and infrastructure overkill at this scale.

### 5. Admin role enforcement

Add the existing `context.IsAdmin()` check to prompt create/update/delete endpoints in `WritingPrompt.cs` and `SpeakingPrompt.cs`. (Currently any logged-in free user can edit the prompt bank; only `User.cs` and one Dashboard endpoint check the role.)

### 6. Input validation at the trust boundary

On the evaluation endpoints, before any Gemini call:

- Reject empty/whitespace submissions with `400`.
- Cap essay text at 10,000 characters and speaking transcript at 20,000 characters; over-limit returns `400`. This is also Gemini cost protection.

## Error handling

- Quota and validation rejections return structured JSON (`{ message: ... }`) with correct status codes (`429`, `400`) so the frontend can display them directly.
- No stack traces or config values in any response body.

## Testing

- One small test (or `assert`-based check) per non-trivial rule: quota boundary (10th allowed, 11th rejected, premium bypass), input caps, admin check rejects non-admin.
- Manual verification: CORS preflight from `localhost:5173` succeeds; from another origin fails.

## Out of scope (deferred)

- Middleware performance (per-request `LastLogin` DB write, per-request `SetCustomUserClaimsAsync`) → refactor phase.
- Azure Speech key handling → speaking-examiner design.
- Frontend changes beyond displaying the 429 message → UI redesign phase.
