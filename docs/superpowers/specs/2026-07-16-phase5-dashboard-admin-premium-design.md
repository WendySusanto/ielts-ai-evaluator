# Phase 5 — Dashboard Trend, Admin Redesign, Premium, Production Prep — Design

**Date:** 2026-07-16
**Status:** Approved
**Scope:** Sub-project 5 of 5 (final v2 phase). Frontend-only — no backend changes.

## Context

The backend already serves everything this phase needs:

- `GET /api/dashboard` returns `bandTrend` (list of `{ createdAt, overallBand, type }`) — typed in the frontend (`src/types/dashboard.ts`) but never rendered.
- `GET/POST /api/speaking-prompts` (list/upsert, admin-gated upsert) — no frontend CRUD.
- `GET /api/manage/recent-evaluations` — unused by the frontend.

Approach chosen: **targeted additions to existing pages**, reusing `useApi`, shadcn components, and the existing react-hook-form patterns. Rejected: tanstack-table + recharts rebuild (two new dependencies for ~10-row tables and a ≤ few-dozen-point chart).

## 1. Dashboard — band trend chart

New `BandTrendCard` component: hand-rolled inline SVG line chart (no chart library).

- Y axis: fixed 0–9 band scale. X axis: time.
- Points colored by type — writing = teal, speaking = orange — via two new dedicated tokens (`--chart-writing`, `--chart-speaking`) with per-mode values validated by the dataviz palette checker (the raw `--primary`/`--tip` tokens fail its chroma/lightness checks). Single connected neutral line through all points in date order; per-point native `<title>` hover tooltips; two-item legend.
- Dashed horizontal line at `ieltsTargetScore` when set.
- Empty state when fewer than 2 points: "Complete more evaluations to see your trend."
- Placed above Recent Evaluations in the left column of `Dashboard.tsx`.
- `DashboardSkeleton` updated to mirror the new layout.
- Upgrade path: add a chart library only if zoom/brush/tooltips are ever needed.

## 2. Admin — split, speaking-prompt CRUD, sortable tables, recent evaluations

`Admin.tsx` (519 lines; `WritingPromptForm` is defined inside the component body — a remount-on-render bug) splits into `src/components/admin/`:

- `WritingPromptsTab` + `WritingPromptForm` (extracted to top level; fixes two latent bugs — the dialog never closing after submit, and the `isActive` Radix checkbox not registering with react-hook-form)
- `SpeakingPromptsTab` + `SpeakingPromptForm`
- `UsersTab` + `RecentEvaluationsDialog`

`Admin.tsx` becomes a thin three-tab shell (Writing Tasks / Speaking Tasks / Users).

**Speaking-prompt form** fields mirror `SpeakingPrompt` (backend model): topic, description, preview, part (`Part1`/`Part2`/`Part3`), question text, cue points (textarea, newline-separated, optional — mainly Part 2), duration (seconds), level (`Academic`/`General`), isActive. Submits to existing `POST /api/speaking-prompts` upsert. List loads with `includeInactive=true` like writing prompts. No delete button — the `isActive` toggle is the archive mechanism.

**Sorting:** one shared `useSortedRows` hook (~20 lines: column key + direction state, client-side sort) with clickable header cells showing a direction arrow. Used by all admin tables.

**Validation:** required fields render inline error text (currently `required: true` blocks submit silently).

**Recent evaluations:** the backend endpoint is per-user (`GET /api/manage/recent-evaluations?userId=…`, 10 most recent, no user info in the DTO), so this ships as a "view recent evaluations" action on each Users row opening a read-only dialog (type, topic, task, band, date). No navigation into feedback pages — ownership checks 403 an admin opening another user's feedback.

Empty states on all tables (already the pattern for writing prompts/users; carried to the new tabs).

## 3. Premium — real pricing page

Replace the `ComingSoon` usage in `Premium.tsx` with a two-column comparison:

- **Free:** the actual quota values — 10 writing + 10 speaking evaluations/day, all feedback features.
- **Premium:** unlimited evaluations, "everything in Free plus…".
- Current-plan badge read from `/api/me`.
- CTA: disabled-style button firing a "Payments coming soon" toast. No billing integration (out of scope for v2).

`ComingSoon` has no other consumers — delete `pages/ComingSoon.tsx` once Premium stops using it.

## 4. Profile — polish only

Light/dark visual pass and spacing consistency with the new pages. No functional changes.

## 5. Production checklist — prep only (no deployment)

`docs/DEPLOYMENT.md` documenting:

- Required App Settings: Gemini API key, Firebase Admin credentials, `AzureSpeechKey` + `AzureSpeechRegion`, CORS production origin.
- Key-rotation reminder (previously exposed Gemini + Firebase keys must be treated as compromised).
- Build/test/run commands for both backend and frontend.

## Error handling

No new error surfaces: all new data flows use the existing `useApi` error → `ErrorPage`/toast patterns. The SVG chart renders its empty state rather than a broken chart for 0–1 points.

## Testing

- Backend untouched; full backend suite re-run as a regression guard.
- Frontend: `npm run build` (includes `tsc -b`) clean.
- Manual light/dark walkthrough of Dashboard, Admin (all four tabs, both CRUD forms), Premium, Profile.
- No new frontend test infrastructure (none exists; manual verification is the project convention).

## Out of scope

- Payments/billing integration (plan field + quotas remain the placeholder).
- Actual Azure deployment (prep docs only).
- User management write operations (users table stays read-only).
- Chart tooltips/zoom (add a chart library if ever needed).
