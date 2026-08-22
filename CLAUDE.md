# Nomad Help Desk — v1 Build Brief (CLAUDE.md)

## What this is
Nomad Help Desk is a **Schengen 90/180 day calculator for US travelers**. v1 is deliberately tiny: one screen that tells a US passport holder how many of their 90 Schengen days they've used, how many remain, when the window resets, and whether a planned trip would push them over. It's a **local-first, installable PWA** — no accounts, no server, works offline. Purpose: personal use, sharing with nomad friends to test, and a portfolio piece. Built by Kevin (code) with his wife Jenn (design/aesthetic).

## Scope — read this before adding anything
v1 is **ONLY** the Schengen calculator. Do **not** add: multi-country visa rules, itineraries, a calendar, AI features, currency conversion, or a world map. Those are explicitly deferred to the backlog and will be added later based on real feedback. If a change isn't the Schengen calculator or its aesthetic, it's out of scope for v1. The goal is a small, **finished, beautifully-styled** app — not a feature-rich unfinished one.

## Stack & constraints
- **React + Vite**; installable PWA via `vite-plugin-pwa` (manifest + service worker, works offline).
- **Local-first storage:** IndexedDB via **Dexie.js**. No accounts, no auth, no backend, no network calls.
- Store dates as `YYYY-MM-DD` strings and do **date-only math** — no JS `Date` objects in storage (avoids timezone off-by-one bugs in day counting).
- **Tests:** Vitest. The 90/180 engine must be thoroughly unit-tested.
- **Deploy:** Vercel (static; no serverless functions needed for v1).
- **Design** lives in `DESIGN.md` and an isolated theme/tokens layer (see Collaboration).

## Data model (minimal)
```
Trip {
  id
  entryDate   // YYYY-MM-DD — day entered the Schengen area
  exitDate    // YYYY-MM-DD — day left
  note?       // optional label
}
```
v1 assumes every trip is a US-passport tourist stay in the Schengen area, so no per-country field is needed yet. Keep the model easy to extend later (a `countryCode`/`area` field is the future hook) but **don't build that now**.

## The core calculation (the heart of the app)
Implement the Schengen rolling 90/180 rule as **pure, tested functions**:

- `schengenStatus(trips, asOf)` → `{ daysUsed, daysRemaining, windowStart, nextResetDate, projectedViolationDate | null }`
  - Counts days present in the Schengen area within the 180-day window ending on `asOf`.
  - **Inclusive counting:** both entry and exit days count as days present.
  - `daysRemaining = 90 - daysUsed`.
  - `nextResetDate`: the soonest date a used day rolls out of the window (i.e. when `daysRemaining` increases).
- `checkPlannedTrip(trips, plannedEntry, plannedExit)` → whether the planned trip would exceed 90 days in any rolling 180-day window, and the first date it would.

Correctness is **non-negotiable** — overstaying has real consequences. Required unit tests: leap years, back-to-back trips, single-day trips (`entry == exit`), trips straddling the 180-day boundary, empty history, and a trip that exactly hits 90.

Note: US travelers will need **ETIAS** authorization from 2026, but it's a travel permit, not a visa, and does **not** change the 90/180 math. Ignore it in v1 (a possible "ETIAS expiry" reminder is backlog).

## The screen (single view)
1. **Status card** (the centerpiece — full spec in `DESIGN.md`): days used / 90, days remaining, a progress bar, next reset date, and a status chip.
2. **Trips list:** add / edit / delete trips with entry & exit date pickers.
3. **Plan a trip:** enter proposed dates, see whether it busts the 90 and the safe latest dates.
4. **Cold-start entrance animation** (see `DESIGN.md` motion spec) — plays once on launch only.
5. Installable + offline (PWA).

## Collaboration structure (Kevin codes, Jenn designs)
- All design decisions live in an **isolated theme/tokens layer** — e.g. `src/theme/` (colors, spacing, radii, typography, motion timings) plus the styled presentational components. Jenn owns this layer and `DESIGN.md`.
- App logic (the 90/180 engine, storage, state, trip input) lives in `src/lib/` and container components. Kevin owns this.
- Keep the seam clean so design changes never touch calculation logic, and vice versa.
- Both work via their own Claude on the shared GitHub repo; **this file and `DESIGN.md` are the shared source of truth.**

## Build order (work in phases; propose a plan and wait for approval before each)
1. Scaffold: Vite + React + PWA config + Dexie schema + basic Trip CRUD.
2. The 90/180 engine + full Vitest suite.
3. The status card + single screen, wired to real data (styled per `DESIGN.md`).
4. The "plan a trip" check.
5. Cold-start entrance animation + offline polish.

## How to proceed
Start by proposing the repo structure and the phase-1 plan, then **wait for approval before writing code**. Keep this file updated as decisions change. Write tests alongside the engine, not after.
