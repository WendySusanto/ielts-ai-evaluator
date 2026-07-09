# v2 Phase 3 — Writing Experience & Feedback Screens Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the writing practice flow and all feedback screens as purpose-built layouts — brand-new-app level, not restyles: topic browser, editor workspace with guidance rail, deep writing-feedback report, speaking-feedback report, and a type-differentiated feedback history. Plus the palette-class sweep the Phase 2 review flagged.

**Architecture:** React 19 + Tailwind 4 + shadcn/ui at `frontend/ielts-ai-evaluator-frontend`. Visual/layout work only — the data layer (Phase 2's `useApi` + v2 DTOs) is correct and MUST NOT change: no new endpoints, no DTO edits, no new dependencies. Each screen is one task with a precise layout spec; implementers read the current page for data wiring and rebuild the JSX around it.

**Tech Stack:** existing only (lucide-react, shadcn components, sonner). No chart libs, no animation libs.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-v2-requirements.md` §8 (incl. the feedback-screens amendment). Reference mockups define the vibe: airy, rounded (radius 1rem), generous whitespace, flat colors.
- **Design rules (every task):** flat colors only, NO gradients; NO emoji — lucide SVG only, `size-4`/`size-5` consistent; semantic tokens ONLY (`bg-background/card/primary/secondary/muted/tip/destructive`, never raw palette classes like `text-green-600` — this phase *removes* those); light AND dark readable (≥4.5:1 body text); touch targets ≥44px on interactive elements; visible focus rings; one primary CTA per screen; micro-transitions 150–300ms transform/opacity only; band scores in tabular-nums.
- Band color coding (used across feedback screens, define once in Task 1): band ≥ 7 → `text-primary`, 5.5–6.5 → `text-tip`, < 5.5 → `text-destructive`; never color alone — always the numeric value beside it.
- Data contracts (do not touch): `WritingEvaluationDetailDto`/`WritingFeedback` in `src/types/evaluation.ts`, `SpeakingSessionDetail`/`SpeakingFeedback`/`SpeakingTurn` in `src/types/Speaking.ts`, history DTOs in `src/types/feedbackHistory.ts`, prompts in `src/types/WritingPrompt.ts`.
- Skeletons: every redesigned screen's skeleton component (`src/components/skeleton/*`) is updated in the same task to mirror the new layout.
- Gate per task: `npm run build` clean in `frontend/ielts-ai-evaluator-frontend`.
- Commit per task.

---

### Task 1: Palette sweep + shared feedback primitives

**Files:**
- Modify: `src/pages/Dashboard.tsx`, `WritingPractice.tsx`, `Writing.tsx`, `Speaking.tsx`, `SpeakingPractice.tsx`, `NotFound.tsx` (+ any file grep finds)
- Create: `src/components/feedback/BandScore.tsx`, `src/components/feedback/CriterionCard.tsx`

**Interfaces:**
- Produces shared primitives later tasks consume:

```tsx
// BandScore: the band number with semantic color + tabular-nums.
// size: "hero" (text-5xl, for page headers) | "md" (text-2xl) | "sm" (text-base font-semibold)
export function BandScore({ band, size = "md" }: { band: number; size?: "hero" | "md" | "sm" })
// color rule: band >= 7 → text-primary; 5.5–6.5 → text-tip; < 5.5 → text-destructive

// CriterionCard: one IELTS criterion. Card with header row (name + BandScore sm),
// justification paragraph (text-sm text-muted-foreground), then two labeled lists:
// "From your answer" (quoted examples, border-l-2 border-border pl-3 italic) and
// "How to improve" (improvements, lucide ArrowUpRight bullet). Props:
export function CriterionCard({ name, band, justification, examples, improvements }: {
  name: string; band: number; justification: string; examples: string[]; improvements: string[];
})
```

- Sweep: replace every raw Tailwind palette class flagged by review — grep `src/pages` and `src/components` for `-(red|green|blue|purple|orange|yellow|indigo|gray|slate)-[0-9]` — with semantic tokens: informational icon tints → `text-primary`/`text-muted-foreground`; success-ish → `text-primary`; warnings/tips → `text-tip`; errors stay `text-destructive`; gray text → `text-muted-foreground`; gray borders → `border-border`; gray buttons → shadcn `variant="outline"`. EXCEPTION: Login/Register's red/green form error/success boxes may keep `destructive`-token styling but not raw palette classes — convert them too (`bg-destructive/10 text-destructive`, success → `bg-primary/10 text-primary`).

- [ ] **Step 1:** Create the two primitives (above).
- [ ] **Step 2:** Run the grep; fix every hit; re-grep to zero (excluding `components/ui/*` shadcn internals if any).
- [ ] **Step 3:** `npm run build` clean.
- [ ] **Step 4:** Commit: `"v2 ui: palette sweep to semantic tokens + shared BandScore/CriterionCard"`

---

### Task 2: Writing topic browser (`Writing.tsx`)

**Files:** Modify `src/pages/Writing.tsx`, `src/components/skeleton/WritingSkeleton.tsx`.

**Layout spec** (replaces the current list; keep the existing `useApi<WritingPromptDto[]>("/api/writing-prompts")` wiring and navigation to `/writing/{taskType}/{id}`):
- Page header: h1 "Writing practice" + one-line subcopy (muted). No hero banner.
- Filter row: shadcn `Tabs` for task type (All / Task 1 / Task 2) + a `Select` for level (All / Academic / General). Client-side filtering.
- Topic grid: responsive `grid gap-4 sm:grid-cols-2 xl:grid-cols-3`. Each card: `Card` with topic title (font-semibold), preview text (line-clamp-2 text-sm text-muted-foreground), footer row with small `Badge` for taskType + level, duration (`Clock` icon + "{duration} min"), min words (`FileText` icon). Whole card clickable (button semantics, `cursor-pointer`, hover: `-translate-y-0.5 shadow-sm transition-transform duration-200`, visible focus ring).
- Empty state: centered `BookOpen` icon (muted), "No topics yet" + "Ask an admin to add writing prompts." — no dead-end.

- [ ] **Step 1:** Rebuild the page per spec; update the skeleton to mirror the grid (header bar + 6 card blocks).
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 ui: writing topic browser grid with filters"`

---

### Task 3: Writing editor workspace (`WritingPractice.tsx`)

**Files:** Modify `src/pages/WritingPractice.tsx`, `src/components/skeleton/WritingPracticeSkeleton.tsx`.

**Layout spec** (mockup-inspired workspace; keep existing data wiring: prompt fetch, submit mutate to `/api/v2/writing/evaluations`, 429 toast, navigate on success):
- Top bar: back button (ghost, `ArrowLeft`) + breadcrumb-style small caps label "{taskType} · {questionType}" (text-xs uppercase tracking-wider text-primary) + topic as h1. Right side: countdown timer chip (`Card` pill, `Clock` icon + mm:ss from `duration`; pause/reset ghost icon buttons ≥44px) — reuse the page's existing timer state if present, else add simple local state.
- Two-column workspace ≥lg (`grid lg:grid-cols-[1fr_320px] gap-6`), stacking on mobile with the guidance rail AFTER the editor:
  - **Main column:** (1) Prompt card — `bg-secondary` tinted card: "Your prompt" label with `FileText` icon, questionText, imageDescription paragraph when present. (2) Response card — header row "Your response" + live counters right-aligned (`{words} / {minimumWords} words · {sentences} sentences`, tabular-nums, words turn `text-tip` while below minimum); `Textarea` min-h-[400px] borderless inside the card (`focus-visible:ring-1`); footer row: "Save draft" outline button (localStorage under key `draft:writing:{promptId}`, restore on mount, `Save` icon, toast on save) + primary "Submit for AI feedback" (disabled while below minimumWords or submitting, spinner while submitting). Below footer: helper line "{n} more words to meet the minimum" in `text-tip` while short.
  - **Guidance rail:** (1) "Suggested structure" card — static per taskType: Task 2 → Introduction/Body 1/Body 2/Conclusion; Task 1 → Introduction/Overview/Body 1/Body 2; numbered circles (`bg-secondary text-secondary-foreground`), each with a one-line description. (2) "Coach's tip" card — `bg-tip text-tip-foreground` filled card, `Lightbulb` icon, one static tip per task type (write 2 sensible IELTS tips). (3) "Not the right topic?" mini-card with outline "Change topic" button → navigate back to `/writing`.
- Draft is cleared from localStorage on successful submit.

- [ ] **Step 1:** Rebuild per spec (preserve all existing handlers/validation); update skeleton to the two-column shape.
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 ui: writing editor workspace with guidance rail and local drafts"`

---

### Task 4: Writing feedback report (`DetailedFeedback.tsx`)

**Files:** Modify `src/pages/DetailedFeedback.tsx`, `src/components/skeleton/DetailedFeedbackSkeleton.tsx`.

**Layout spec** (consumes `WritingEvaluationDetailDto`; keep fetch wiring):
- Header band: back button + "{taskType} · {topic}" small caps + h1 "Writing feedback". Right: `BandScore size="hero"` with "Overall band" label + submission date (muted, `formatDate`).
- Summary strip: full-width `bg-secondary` card with the feedback `summary` paragraph.
- Criteria: `grid gap-4 md:grid-cols-2` of four `CriterionCard`s (Task 1 primitives).
- "Your essay, annotated": card with the essay text; below it "Corrections" list — each `WritingError` as a row: quote (line-through `text-destructive`), `ArrowRight` icon, correction (`text-primary font-medium`), then the rule as text-sm muted on the next line. (True inline highlighting is out of scope — a matched-quote list is the v1 of annotation; note this in code with a `// ponytail:` comment.)
- Two-up on ≥md: "Vocabulary upgrades" card (rows: original → upgrade, context muted below) and "Improved excerpt" card (`bg-secondary`, the improvedExcerpt as a quoted block).
- Footer actions: primary "Practice again" → `/writing`; outline "View history" → `/feedback`.

- [ ] **Step 1:** Rebuild per spec; update skeleton.
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 ui: writing feedback report layout"`

---

### Task 5: Speaking feedback report (`SpeakingFeedback.tsx`)

**Files:** Modify `src/pages/SpeakingFeedback.tsx`, relevant skeleton if one exists (create a simple one mirroring the layout if none).

**Layout spec** (consumes `SpeakingSessionDetail`; keep fetch wiring; DIFFERENT layout from writing — conversation-first):
- Header band: back + "{part} · {topic}" small caps + h1 "Speaking feedback"; right: hero `BandScore` + date.
- Summary strip: as in Task 4.
- Criteria: `grid gap-4 md:grid-cols-2`: the three Gemini `CriterionCard`s PLUS a fourth "Pronunciation" card — when `pronunciation` is null: same Card shape, `AudioLines` icon, "Not assessed yet" title, muted copy "Pronunciation scoring with per-word analysis arrives with the live examiner." (This card is the Phase 4 slot — keep its shape identical to CriterionCard's header so the future swap is seamless.)
- Transcript: "Your conversation" card — turns rendered as a chat: examiner turns left-aligned (`bg-muted` bubble, "Examiner" label text-xs), candidate turns right-aligned (`bg-secondary` bubble, "You"). Max-w-[85%] bubbles, rounded-2xl, space-y-3.
- Footer actions: primary "Practice again" → `/speaking`; outline "View history" → `/feedback`.

- [ ] **Step 1:** Rebuild per spec; skeleton mirrors layout.
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 ui: speaking feedback report layout with conversation transcript"`

---

### Task 6: Feedback history (`FeedbackHistory.tsx`)

**Files:** Modify `src/pages/FeedbackHistory.tsx`, `src/components/skeleton/FeedbackHistorySkeleton.tsx`.

**Layout spec** (keep the dual fetch + client merge/sort):
- Header: h1 "Feedback history" + subcopy; right-aligned filter `Tabs`: All / Writing / Speaking.
- Stat row: three small stat tiles (`grid sm:grid-cols-3 gap-4`): total sessions, writing average band, speaking average band (computed client-side; `BandScore size="sm"`; em dash when no data).
- List: one card per item (`space-y-3`, not a table): leading icon disc (`bg-secondary` circle: `PenTool` for writing / `Mic` for speaking), title = topic (font-medium) with small caps type+part/taskType label under it, right side: `BandScore size="sm"` + relative date (muted) + `ChevronRight`. Whole row clickable → the correct detail route per type. Rows ≥44px tall, hover `bg-muted/50`.
- Empty states: per-filter (e.g. "No speaking sessions yet" + CTA button to `/speaking`).

- [ ] **Step 1:** Rebuild per spec; update skeleton (stat row + 5 row blocks).
- [ ] **Step 2:** `npm run build` clean.
- [ ] **Step 3:** Commit: `"v2 ui: type-differentiated feedback history with band stats"`

---

### Task 7: Visual verification

**Files:** none.

- [ ] **Step 1:** Start backend (`func start`) + frontend (`npm run dev`). Walk every redesigned route in light AND dark: `/writing`, `/writing/{task}/{id}`, `/feedback/{id}`, `/speaking-feedback/{id}`, `/feedback`.
- [ ] **Step 2:** Checks: no gradients/emoji/raw palette classes (grep re-run); counters and band colors correct; drafts save/restore; empty states render (fresh DB helps); dark-mode contrast on the `bg-tip` coach card and chat bubbles; keyboard focus visible on card grids.
- [ ] **Step 3:** Leave servers running and hand the interactive pass to the user.
