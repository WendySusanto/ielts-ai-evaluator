# UI Redesign — "When IELTS?" Rebrand — Design

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Sub-project 2 of 5 (Security → UI redesign → Speaking examiner → Writing detail → Refactor)

## Context

Frontend: React 19 + Vite + Tailwind 4 + shadcn/ui components bound to CSS variables in `src/index.css`, currently on the default neutral grayscale theme with one-off indigo gradients (`src/styles/gradients.ts`) and per-color card variables. User-provided mockups define the target *vibe* (not pixel-faithful): light, rounded, airy; teal primary, cream background, orange accents; "When IELTS?" branding.

## Decisions

- Rebrand app to **"When IELTS?"** with tagline "LEARN · SPEAK · WRITE".
- Mockups are inspiration only — same vibe, not a faithful copy.
- **Restyle existing functionality only.** No new features: no global search, no day-streak counter, no notifications bell, no live-scoring panels. Those are future sub-projects.
- **Light and dark themes**, both fully designed. Existing `ThemeContext` toggle stays.

## Approach: token-first retheme + targeted page polish

Chosen over (a) page-by-page component rebuild — slower, discards working shadcn wiring — and (b) tokens-only — misses the layout character (hero banners, tip cards, stat tiles) that defines the mockups' vibe.

1. Replace the CSS variable values in `index.css` with the new palette; ~80% of the UI restyles automatically through the existing shadcn bindings.
2. Per-page pass to adjust layouts and hero moments.

## Design system (all in `index.css`)

### Palette
- **Light:** teal primary (buttons, active nav, links); warm cream page background; white cards; orange accent (tips, highlights, warnings); charcoal text.
- **Dark:** deep charcoal-teal background; elevated dark cards; same teal/orange accents tuned for WCAG AA contrast.
- Remove one-off hardcoded colors: `GRADIENT_INDIGO` and friends in `src/styles/gradients.ts`, and the per-color card variables (`--card-background-blue-light`, red/purple/orange variants) — replaced by the new tokens.

### Shape & type
- Generous radii: ~1rem cards, pill buttons; soft borders; minimal shadows.
- One friendly geometric sans for everything — **Plus Jakarta Sans**, self-hosted via `@fontsource` (no CDN); bold weights for headings; system-ui fallback.

## Rebrand touchpoints

- Sidebar header: logo mark + "When IELTS?" + tagline.
- Login and Register pages.
- `index.html` title and favicon.

## Screens (every route, same tokens)

Login, Register, Dashboard, Speaking, SpeakingPractice, SpeakingFeedback, Writing, WritingPractice, DetailedFeedback, FeedbackHistory, Profile, Premium, Admin, NotFound, ComingSoon, ErrorPage — plus all skeleton components (`src/components/skeleton/*`), which must mirror the new layouts so loading states don't flash the old structure.

Sidebar keeps its current information architecture (Practice: Dashboard / Speaking / Writing; Account: Feedback History / Premium / Admin) restyled to match: teal active pill, section labels, avatar footer.

## Error handling

No behavioral changes. Error, empty, and loading states are restyled with the same tokens; the 429 quota message from the security sub-project renders as a styled callout with an upgrade link on the practice pages.

## Testing

- `npm run build` (includes `tsc -b`) passes clean.
- Manual visual walk-through of every route in both light and dark mode.
- No functional regressions: all existing flows (auth, submit essay, view feedback, admin CRUD) still work.

## Out of scope (deferred)

- Streak, global search, notifications, live-scoring UI → future sub-projects.
- Speaking-page conversational UI → speaking-examiner sub-project (it will consume this design system).
- Component-level refactors not needed for restyling → refactor phase.
