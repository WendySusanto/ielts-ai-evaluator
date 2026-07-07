# v2 Phase 2 — Frontend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the frontend core for v2: typed API client (no envelope), auth flow on `/api/auth/sync`, the "When IELTS?" flat teal/cream/orange theme (light+dark, no gradients, no emoji), and every page ported to the v2 endpoints so the app works end-to-end against the Phase 1 backend.

**Architecture:** React 19 + Vite + Tailwind 4 + shadcn/ui in `frontend/ielts-ai-evaluator-frontend`. The shadcn `components/ui/*` stay; retheming happens through the CSS variables they already consume. Data layer: one typed client (`lib/api.ts`) + one hook (`use-api`) that keeps the old hook's return shape (`{data,isLoading,error,refetch,mutate}`) so page ports stay mechanical. Deep feedback-screen redesign is Phase 3; this phase renders new feedback shapes correctly but simply.

**Tech Stack:** TypeScript, axios (existing), `@fontsource-variable/plus-jakarta-sans` (new dep — self-hosted font, spec-mandated), firebase auth (existing).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-v2-requirements.md` (§3, 4, 8).
- API contract: 2xx = DTO directly; errors = status + `{ message }`. Client throws `ApiError { status, message }`.
- Backend runs at `http://localhost:7071` (Functions default). `VITE_API_BASE_URL` overrides; default must be `http://localhost:7071`. No `withCredentials` (Bearer auth, not cookies).
- Backend DTOs serialize camelCase (ASP.NET Core defaults): e.g. `WritingEvaluationDto` → `{ writingEvaluationId, overallBand, feedback: { overallBand, summary, criteria: [{ name, band, justification, examples, improvements }], errors: [{ quote, correction, rule }], vocabularyUpgrades: [{ original, upgrade, context }], improvedExcerpt } }`; speaking detail → `{ speakingSessionId, part, turns: [{ role, text }], overallBand, feedback: { overallBand, summary, criteria: [...3] }, pronunciation: null, createdAt }`; auth sync → `{ userId, email, fullName, plan, ieltsTargetScore, targetTestDate, claimsRefreshRequired }`; `/api/me` same minus `claimsRefreshRequired` plus `createdAt`.
- **No gradients anywhere. No emoji as icons — lucide SVG only.** Delete `src/styles/gradients.ts` and `src/types/ApiResponse.ts`.
- Both themes (light + dark) at every step; body text contrast ≥ 4.5:1.
- Gate per task: `npm run build` (tsc + vite) clean in `frontend/ielts-ai-evaluator-frontend`.
- The v1 backend is gone — until Task 4 lands, pages that still call old routes 404 at runtime; that's expected mid-phase. Build stays green throughout.

### Endpoint migration map (used by Tasks 2 & 4)

| Old call (file) | New call |
|---|---|
| GET `/api/GetUserProfile` (auth.ts, Profile.tsx) | POST `/api/auth/sync` (auth flow) / GET `/api/me` (profile page) |
| POST `/api/user` (Profile.tsx) | PUT `/api/me` body `{ fullName, ieltsTargetScore, targetTestDate }` |
| GET `/api/user` (Admin.tsx) | GET `/api/manage/users` |
| POST `/api/user` (Admin.tsx user edit) | **removed** — no v2 endpoint; drop the UI affordance (Phase 5 may add a proper admin plan-change endpoint) |
| GET `/api/writing-prompt` / `?id=X` | GET `/api/writing-prompts` / `/api/writing-prompts/{id}` |
| GET `/api/speaking-prompt` / `?id=X` | GET `/api/speaking-prompts` / `/api/speaking-prompts/{id}` |
| POST `/api/writing-prompt` (Admin) | POST `/api/writing-prompts` (payload now includes `isActive`) |
| POST `/api/speaking-prompt` (Admin) | POST `/api/speaking-prompts` |
| POST `/api/writing/evaluate` | POST `/api/v2/writing/evaluations` body `{ writingPromptId, essayText }` |
| POST `/api/speaking/evaluate` | POST `/api/v2/speaking/sessions` body `{ speakingPromptId, part, turns: [{ role: "candidate", text }] }` |
| GET `/api/evaluation-history?userId=` | GET `/api/v2/writing/evaluations` (no param — identity from token) |
| GET `/api/speaking-history` | GET `/api/v2/speaking/sessions` |
| GET `/api/evaluation-detail?id=` | GET `/api/v2/writing/evaluations/{id}` |
| GET `/api/speaking-detail?id=` | GET `/api/v2/speaking/sessions/{id}` |
| GET `/api/dashboard` | GET `/api/dashboard` (new DTO: counts, averageBand, bandTrend, recentItems with `type: "writing"|"speaking"`) |

---

### Task 1: Typed API client + use-api hook

**Files:**
- Create: `src/lib/api.ts`
- Rewrite: `src/hooks/use-fetch.ts` → rename file to `src/hooks/use-api.ts` (update all 10 importer files' import path/name only — call-site signature is preserved)
- Modify: `src/lib/axiosInstance.ts`
- Delete: `src/types/ApiResponse.ts`

**Interfaces:**
- Produces (everything later consumes):

```typescript
// src/lib/api.ts
import axiosInstance from "@/lib/axiosInstance";
import { auth } from "@/lib/firebase";
import { AxiosError } from "axios";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(method: string, url: string, data?: unknown): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  try {
    const res = await axiosInstance.request<T>({
      method,
      url,
      data,
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
  } catch (e) {
    const ax = e as AxiosError<{ message?: string }>;
    const status = ax.response?.status ?? 0;
    const message = ax.response?.data?.message ?? ax.message ?? "Request failed";
    throw new ApiError(status, message);
  }
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  put: <T>(url: string, body?: unknown) => request<T>("PUT", url, body),
  delete: <T>(url: string) => request<T>("DELETE", url),
};
```

- `axiosInstance.ts`: baseURL default becomes `http://localhost:7071`; remove `withCredentials: true`. Content-Type header is axios-automatic for JSON bodies.
- `use-api.ts` — same state machine and return shape as the old hook (`data`, `isLoading`, `error`, `refetch`, `mutate({url, method, data, onSuccess, onError})`, `skipInitialFetch` option) but built on `api` (no envelope unwrap, `error: ApiError | null`). `mutate`'s `onSuccess` receives the response DTO directly. Export both `useApi` and a `const useFetch = useApi` alias is NOT wanted — update importers to `useApi` (mechanical rename).

- [ ] **Step 1:** Create `api.ts` as above; fix `axiosInstance.ts`; write `use-api.ts`; delete `use-fetch.ts` and `types/ApiResponse.ts`; update the 10 importing files' import lines and any `ApiResponse<...>` type args (Speaking.tsx, Writing.tsx, Admin.tsx use it — replace with the plain payload type).
- [ ] **Step 2:** `npm run build` in `frontend/ielts-ai-evaluator-frontend` → clean.
- [ ] **Step 3:** Commit: `git add frontend && git commit -m "v2 frontend: typed api client + use-api hook, envelope removed"`

---

### Task 2: Auth flow on /api/auth/sync

**Files:**
- Modify: `src/lib/auth.ts` (replace `refreshToken`)
- Modify: `src/contexts/AuthContext.tsx`
- Modify: `src/components/PrivateRoute.tsx` (add optional admin gate)

**Interfaces:**
- Produces:

```typescript
// auth.ts — replaces refreshToken(); same concurrency guard pattern retained
export interface AuthProfile {
  userId: string;
  email: string;
  fullName: string;
  plan: string;
  ieltsTargetScore: number | null;
  targetTestDate: string | null;
  claimsRefreshRequired: boolean;
}

export const syncProfile = async (): Promise<AuthProfile> => {
  // POST /api/auth/sync via api client; if result.claimsRefreshRequired,
  // await auth.currentUser!.getIdToken(true) to pick up fresh custom claims.
};
```

- `AuthContext`: on auth state change call `syncProfile()` (replaces `authService.refreshToken()`), then read `role`/`userId` claims from `getIdTokenResult()` as today. Remove the `console.log`s. Expose `role` on the context value (derived from claims, default `"Free"`).
- `PrivateRoute`: accept optional `requireAdmin?: boolean`; when set and `role !== "Admin"`, redirect to `/`. Wire it on the `/admin` route in `App.tsx`.

- [ ] **Step 1:** Implement `syncProfile` (keep the isRefreshing/refreshPromise dedupe), update `AuthContext`, `PrivateRoute`, `App.tsx` admin route.
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 frontend: auth sync flow with claim refresh + admin route gate"`

---

### Task 3: Theme rebuild — tokens, font, rebrand assets

**Files:**
- Rewrite: `src/index.css`
- Delete: `src/styles/gradients.ts`
- Modify (gradient usages → token classes; from the inventory): `MainLayout.tsx` (`GRADIENT_BACKGROUND` → `bg-background`), `Dashboard.tsx`, `Speaking.tsx`, `Writing.tsx`, `SpeakingPractice.tsx`, `WritingPractice.tsx`, `SpeakingFeedback.tsx`, `Admin.tsx`, `ComingSoon.tsx`, `Profile.tsx` (`GRADIENT_INDIGO*` → `bg-primary text-primary-foreground` for headers/buttons; inline gradient string in WritingPractice.tsx:382 likewise)
- Modify: `index.html` (title `When IELTS?`, `<link rel="icon">` inline SVG data-URI: rounded teal square with white "W"), `package.json` (+`@fontsource-variable/plus-jakarta-sans`), `src/main.tsx` (font import)

**Interfaces:** the full new `index.css` token set. Standard shadcn names only, plus ONE custom pair (`--tip`) for orange callouts:

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: "Plus Jakarta Sans Variable", system-ui, sans-serif;

  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-tip: var(--tip);
  --color-tip-foreground: var(--tip-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

:root {
  --radius: 1rem;

  /* When IELTS? light: warm cream canvas, white cards, teal primary, orange tips */
  --background: oklch(0.977 0.008 84);
  --foreground: oklch(0.25 0.02 240);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.25 0.02 240);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.25 0.02 240);
  --primary: oklch(0.51 0.09 195);              /* deep teal, ≥4.5:1 on white */
  --primary-foreground: oklch(0.99 0.003 84);
  --secondary: oklch(0.93 0.02 190);            /* pale teal tint */
  --secondary-foreground: oklch(0.35 0.06 195);
  --muted: oklch(0.955 0.008 84);
  --muted-foreground: oklch(0.5 0.02 240);
  --accent: oklch(0.93 0.02 190);
  --accent-foreground: oklch(0.35 0.06 195);
  --destructive: oklch(0.55 0.2 27);
  --destructive-foreground: oklch(0.99 0.003 84);
  --tip: oklch(0.62 0.15 45);                   /* warm orange */
  --tip-foreground: oklch(0.995 0.005 84);
  --border: oklch(0.91 0.012 84);
  --input: oklch(0.91 0.012 84);
  --ring: oklch(0.51 0.09 195);
  --chart-1: oklch(0.51 0.09 195);
  --chart-2: oklch(0.62 0.15 45);
  --chart-3: oklch(0.65 0.09 220);
  --chart-4: oklch(0.72 0.11 150);
  --chart-5: oklch(0.6 0.12 300);
  --sidebar: oklch(0.99 0.005 84);
  --sidebar-foreground: oklch(0.35 0.02 240);
  --sidebar-primary: oklch(0.51 0.09 195);
  --sidebar-primary-foreground: oklch(0.99 0.003 84);
  --sidebar-accent: oklch(0.94 0.015 190);
  --sidebar-accent-foreground: oklch(0.35 0.06 195);
  --sidebar-border: oklch(0.92 0.01 84);
  --sidebar-ring: oklch(0.51 0.09 195);
}

.dark {
  --background: oklch(0.19 0.015 220);          /* deep charcoal-teal */
  --foreground: oklch(0.93 0.008 84);
  --card: oklch(0.235 0.017 220);
  --card-foreground: oklch(0.93 0.008 84);
  --popover: oklch(0.235 0.017 220);
  --popover-foreground: oklch(0.93 0.008 84);
  --primary: oklch(0.72 0.1 185);               /* lifted teal for dark bg */
  --primary-foreground: oklch(0.17 0.02 220);
  --secondary: oklch(0.3 0.03 200);
  --secondary-foreground: oklch(0.88 0.03 190);
  --muted: oklch(0.27 0.018 220);
  --muted-foreground: oklch(0.68 0.015 220);
  --accent: oklch(0.3 0.03 200);
  --accent-foreground: oklch(0.88 0.03 190);
  --destructive: oklch(0.66 0.18 25);
  --destructive-foreground: oklch(0.16 0.02 220);
  --tip: oklch(0.7 0.14 50);
  --tip-foreground: oklch(0.17 0.02 220);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.1 185);
  --chart-1: oklch(0.72 0.1 185);
  --chart-2: oklch(0.7 0.14 50);
  --chart-3: oklch(0.68 0.1 220);
  --chart-4: oklch(0.72 0.11 150);
  --chart-5: oklch(0.68 0.12 300);
  --sidebar: oklch(0.215 0.016 220);
  --sidebar-foreground: oklch(0.88 0.01 84);
  --sidebar-primary: oklch(0.72 0.1 185);
  --sidebar-primary-foreground: oklch(0.17 0.02 220);
  --sidebar-accent: oklch(0.29 0.025 205);
  --sidebar-accent-foreground: oklch(0.88 0.03 190);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.72 0.1 185);
}

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground font-sans; }
}
```

Note what's GONE relative to the old file: the `--card-background-{blue,red,purple,orange}-*` family, `--card-background-light`, `--card-border`, `--muted-foreground-bold`, `--badge-background-indigo*`, and the duplicate `--secondary` definitions. Compile errors/undefined-class fallout in components that used those Tailwind classes (`bg-card-blue-light` etc.) are fixed by substituting semantic tokens: informational tints → `bg-secondary`, warnings/tips → `bg-tip/10 text-tip border-tip/30`, badges → shadcn `Badge` variants.

- [ ] **Step 1:** `npm install @fontsource-variable/plus-jakarta-sans`; add `import "@fontsource-variable/plus-jakarta-sans";` at the top of `src/main.tsx`.
- [ ] **Step 2:** Replace `index.css` with the file above. Grep `src/` for `card-blue-light|card-red-light|card-purple-light|card-orange-light|card-background-light|muted-foreground-bold|badge-indigo|card-border` and substitute semantic tokens per the note.
- [ ] **Step 3:** Delete `gradients.ts`; fix the 10 importer files per the Files list (flat `bg-primary` replaces every gradient).
- [ ] **Step 4:** `index.html`: `<html lang="en">`, title `When IELTS?`, inline SVG favicon data-URI (teal rounded square, white bold "W" text glyph).
- [ ] **Step 5:** `npm run build` clean. Quick `npm run dev` visual check of Login in light + dark (toggle via existing ThemeContext).
- [ ] **Step 6:** Commit: `"v2 frontend: When IELTS theme tokens, Plus Jakarta Sans, gradients removed"`

---

### Task 4: Port all pages to v2 endpoints + DTO types

**Files:**
- Modify types: `src/types/dashboard.ts`, `WritingPrompt.ts`, `Speaking.ts` (+`SpeakingTopic.ts`), `evaluation.ts`, `EssayEvaluate.ts`, `feedbackHistory.ts`, `User.ts` — align to the camelCase v2 DTOs in Global Constraints (add `WritingFeedback`, `SpeakingFeedback`, `FeedbackCriterion`, `WritingError`, `VocabularyUpgrade`, `SpeakingTurn`, `DashboardData` with `recentItems[{type,...}]`, `AuthProfile` reuse from Task 2).
- Modify pages per the endpoint migration map: `Dashboard.tsx`, `Writing.tsx`, `Speaking.tsx`, `WritingPractice.tsx`, `SpeakingPractice.tsx`, `DetailedFeedback.tsx`, `SpeakingFeedback.tsx`, `FeedbackHistory.tsx`, `Admin.tsx`, `Profile.tsx`.

**Interfaces:** consumes Task 1's `useApi`/`api` + Task 2's auth. Produces a fully working app against the Phase 1 backend.

Key port notes (the non-mechanical bits):
- `WritingPractice.tsx` submit body becomes `{ writingPromptId, essayText }`; response `{ writingEvaluationId, overallBand, feedback }`; navigate to `/feedback/{writingEvaluationId}` as before.
- `SpeakingPractice.tsx` submit body becomes `{ speakingPromptId, part, turns: [{ role: "candidate", text: transcript }] }` (single-turn until Phase 4); response `{ speakingSessionId, ... }`; navigate to `/speaking-feedback/{speakingSessionId}`.
- `DetailedFeedback.tsx` / `SpeakingFeedback.tsx`: render the NEW feedback shape **simply** (overall band, summary, one Card per criterion with band/justification/examples/improvements; writing also lists errors + vocabulary upgrades + improved excerpt; speaking renders the turns transcript and a "Pronunciation: not assessed yet" placeholder when `pronunciation` is null). Purpose-built redesign is Phase 3 — do not gold-plate.
- `FeedbackHistory.tsx`: two calls (`/api/v2/writing/evaluations`, `/api/v2/speaking/sessions`), merge + sort desc client-side, type badge per row (lucide `PenTool`/`Mic` icons).
- `Admin.tsx`: users list from `/api/manage/users` read-only (drop the user-edit mutate + its dialog); prompt upsert to plural routes with an `isActive` switch field added to the form.
- `Profile.tsx`: GET `/api/me`, PUT `/api/me` with `{ fullName, ieltsTargetScore, targetTestDate }`; drop fields that no longer exist (`authProvider`, `ieltsTargetType`, quota counters).
- Delete `src/types/EssayEvaluate.ts` if fully superseded; keep type files one-per-domain, no `any`.

- [ ] **Step 1:** Update the type files first (compiler then drives the page ports).
- [ ] **Step 2:** Port pages in the order: Dashboard → Writing/WritingPractice → DetailedFeedback → Speaking/SpeakingPractice → SpeakingFeedback → FeedbackHistory → Profile → Admin. Run `npm run build` after each pair.
- [ ] **Step 3:** Full `npm run build` clean.
- [ ] **Step 4:** Commit: `"v2 frontend: all pages on v2 endpoints and typed DTOs"`

---

### Task 5: Shell rebrand — sidebar, layout, auth pages

**Files:**
- Modify: `src/components/AppSidebar.tsx`, `src/components/MainLayout.tsx`, `src/pages/Login.tsx`, `src/pages/Register.tsx`

**Interfaces:** visual only; no data-flow changes.

- Sidebar header: inline SVG logo mark (teal rounded square + white "W", same glyph family as favicon) + "When IELTS?" (font-semibold) + "LEARN · SPEAK · WRITE" (text-xs tracking-widest text-muted-foreground). Section labels ("Practice", "Account") as `text-xs uppercase tracking-wider text-muted-foreground`. Active item: `bg-sidebar-primary text-sidebar-primary-foreground` rounded-full pill. Icons lucide, size-4, consistent stroke.
- MainLayout: plain `bg-background`; content container `max-w-6xl mx-auto px-4 md:px-8`.
- Login/Register: centered card on cream background, logo + wordmark above the form, teal primary button, orange link accents. No gradients, no stock imagery.
- Every touch target ≥ 44px; visible focus rings (`outline-ring` already in base layer).

- [ ] **Step 1:** Implement the four files' restyle.
- [ ] **Step 2:** `npm run build` clean; `npm run dev` visual pass of sidebar + auth pages, light and dark.
- [ ] **Step 3:** Commit: `"v2 frontend: When IELTS shell rebrand (sidebar, layout, auth pages)"`

---

### Task 6: End-to-end verification

**Files:** none.

- [ ] **Step 1:** Start backend (`func start` in `backend/IELTS.AI.Evaluator.Functions`) and frontend (`npm run dev`). Sign in with a real account.
- [ ] **Step 2:** Verify: login triggers `/api/auth/sync` 200 and (first time) a token refresh; dashboard loads; writing flow end-to-end (pick prompt → submit essay → feedback renders new shape); speaking flow end-to-end (record/type → submit → feedback with "Pronunciation: not assessed yet"); history shows both types; profile GET/PUT; admin page lists users + upserts a prompt (admin account) and is unreachable for a Free user.
- [ ] **Step 3:** Toggle dark mode on every route; confirm readable contrast and no leftover indigo/gradient styling. Note anything unresolved for the user's own smoke test.
