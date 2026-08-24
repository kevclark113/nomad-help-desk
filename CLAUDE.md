# Nomad Help Desk — Build Brief (CLAUDE.md)

> **Status:** v1 (the Schengen calculator) is **shipped** and live at
> https://nomadhelpdesk.vercel.app. **v2 (optional accounts + cloud sync via
> Firebase) is shipped** too — see "v2 — Accounts & sync" below. This file and
> `DESIGN.md` remain the shared source of truth; keep them updated as decisions change.

## What this is
Nomad Help Desk is a **Schengen 90/180 day calculator for US travelers**. One screen that tells a US passport holder how many of their 90 Schengen days they've used, how many remain, when a day frees up, and whether a planned trip would push them over. It's an **installable, offline-first PWA**. Accounts are **optional**: use it instantly with local-only storage, or sign in to back up and sync across devices. Purpose: personal use, sharing with nomad friends to test, and a portfolio piece. Built by Kevin (code) with his wife Jenn (design/aesthetic).

## Scope — read this before adding anything
The app is **the Schengen calculator plus optional accounts/sync — nothing more**. Do **not** add: multi-country visa rules, itineraries, a calendar, AI features, currency conversion, or a world map. Those are explicitly deferred to the backlog and will be added later based on real feedback. If a change isn't the Schengen calculator, its aesthetic, or the accounts/sync plumbing, it's out of scope. The goal is a small, **finished, beautifully-styled** app — not a feature-rich unfinished one.

## Stack & constraints
- **React + Vite + TypeScript**; installable PWA via `vite-plugin-pwa` (manifest + service worker, works offline).
- **Offline-first storage.** Signed out → IndexedDB via **Dexie.js** (local only, no network). Signed in → **Firestore** with offline persistence (local cache + automatic sync).
- **Auth:** Firebase Auth — Google + Email/Password. Accounts are optional; the app is fully usable signed out.
- Store dates as `YYYY-MM-DD` strings and do **date-only math** — no JS `Date` objects in storage (avoids timezone off-by-one bugs in day counting).
- **Tests:** Vitest. The 90/180 engine must be thoroughly unit-tested.
- **Deploy:** Vercel (static frontend; Firebase is the only backend). Every push to `main` auto-deploys.
- **Design** lives in `DESIGN.md` and an isolated theme/tokens layer (see Collaboration).

## Data model (minimal)
```
Trip {
  id          // string (uuid) — same shape in Dexie and Firestore
  entryDate   // YYYY-MM-DD — day entered the Schengen area
  exitDate    // YYYY-MM-DD — day left
  note?       // optional label
}
```
Stored locally in Dexie (`trips` store) when signed out, and at `users/{uid}/trips/{id}` in Firestore when signed in. Every trip is assumed to be a US-passport tourist stay in the Schengen area, so no per-country field yet — a `countryCode`/`area` field is the future hook, but **don't build that now**. The 90/180 engine takes only a minimal `TripDates` shape (`{ entryDate, exitDate }`), so it stays decoupled from storage.

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
1. **Status card** (the centerpiece — full spec in `DESIGN.md`): days used / 90, days remaining, a progress bar, when a day frees up, and a status chip. The chip scales **on track → cutting it close → will exceed → over**; "will exceed" fires when a saved *future* trip will breach 90, and a past overstay that has rolled out of the window is **not** flagged (reflects today's status). The trip that causes a breach is flagged in the list.
2. **Trips list:** add / edit / delete trips with entry & exit date pickers.
3. **Plan a trip:** enter proposed dates, see whether it busts the 90 and the latest safe exit.
4. **Account:** optional sign-in (Google / Email+Password) to back up & sync; shows a "synced" state when signed in. Hidden if Firebase isn't configured.
5. **Cold-start entrance animation** (see `DESIGN.md` motion spec) — plays once on launch only.
6. Installable + offline (PWA).

## v2 — Accounts & sync (shipped)
Optional Firebase accounts layered on without disturbing the local-first core.
- **Auth:** Firebase Auth (Google + Email/Password). `src/auth/AuthProvider.tsx` exposes `useAuth()` (`user`, `loading`, `enabled`, sign-in/up/out). `src/components/AccountPanel.tsx` is the UI.
- **Storage switch:** `src/lib/useTripStore.ts` is the single source of trips — routes to Dexie (`src/lib/db.ts`) when signed out, Firestore (`src/lib/firestoreTrips.ts`) when signed in, reactive both ways.
- **Migration:** on first sign-in, local Dexie trips are copied into the user's Firestore collection once (idempotent, keyed by trip id; guarded by a `nomad-migrated-{uid}` localStorage flag).
- **Security:** `firestore.rules` — a user can read/write only `users/{uid}/trips`; everything else denied. Rules are published in the Firebase console (keep the repo copy in sync).
- **Lazy loading:** the Firebase SDK is dynamically imported (`loadFirebase()` in `src/lib/firebase.ts`) so signed-out first-time visitors never download it. `firebaseEnabled` is a cheap sync env check.
- **Config:** public Firebase web config via `VITE_FIREBASE_*` env vars (`.env.local` locally, Vercel env vars in prod; see `.env.example`). These are public by design — security is the rules, not secrecy.
- **Prod setup gotchas:** the production domain must be added to Firebase Auth → Authorized domains for Google sign-in; env vars must be set in Vercel and a fresh (non-cached) build deployed.

## Collaboration structure (Kevin codes, Jenn designs)
- All design decisions live in an **isolated theme/tokens layer** — e.g. `src/theme/` (colors, spacing, radii, typography, motion timings) plus the styled presentational components. Jenn owns this layer and `DESIGN.md`.
- App logic (the 90/180 engine, storage, state, trip input) lives in `src/lib/` and container components. Kevin owns this.
- Keep the seam clean so design changes never touch calculation logic, and vice versa.
- Both work via their own Claude on the shared GitHub repo; **this file and `DESIGN.md` are the shared source of truth.**

## Git & deploy workflow (IMPORTANT — read before pushing)
Production is on Vercel, tied to **Kevin's** account. A push to `main` from anyone
else does **not** trigger a deploy, so **never push directly to `main`.**

- **Everyone except Kevin (e.g. Jenn's Claude): open a Pull Request.**
  1. Branch off `main` (e.g. `git switch -c design/<short-name>`).
  2. Commit the work; run `npm run build` and `npm test` first — a PR must build clean and keep tests green.
  3. Push the branch and open a PR against `main`: `gh pr create --fill --base main`.
  4. Leave it for Kevin to review and merge. Do not merge your own PR.
- **Kevin:** review the PR, then **merge it** — merging as the Vercel-authorized user triggers the production deploy. If a merge ever doesn't kick off a deploy, push an empty commit to `main` to trigger it: `git commit --allow-empty -m "trigger deploy" && git push`.
- Keep PRs focused (one coherent change) and describe what changed and why, so review is quick.

## Build order (history — all shipped)
**v1**
1. Scaffold: Vite + React + TS + PWA config + Dexie schema + basic Trip CRUD.
2. The 90/180 engine + full Vitest suite.
3. The status card + single screen, wired to real data (styled per `DESIGN.md`).
4. The "plan a trip" check.
5. Cold-start entrance animation + offline polish + PWA icons.

**v2 (accounts & sync)**
1. Firebase setup + SDK config + auth context.
2. Auth UI (Google + Email/Password).
3. Firestore data layer + storage switch + local→cloud migration + security rules.
4. Lazy-load Firebase (code-split out of the main bundle).

## How to proceed
Work in small, verified phases; **propose a plan and wait for approval before writing code** for any new phase. Keep this file and `DESIGN.md` updated as decisions change. Write tests alongside the engine, not after.

## Backlog (deferred — do not build without a decision)
Multi-country / non-Schengen visa rules, itineraries/calendar, currency, world map, ETIAS expiry reminder, cross-device conflict UI, analytics events (Measurement ID is wired but unused).
