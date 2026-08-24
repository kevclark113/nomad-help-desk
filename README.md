# Nomad Help Desk

A **Schengen 90/180 day calculator** for US travelers. Log your Schengen-area
trips and see how many of your 90 days you've used, how many remain, when the
window resets, and whether a planned trip would push you over.

**Live app:** https://nomadhelpdesk.vercel.app

It's an **installable, offline-first PWA**. Accounts are **optional**: use it
instantly with local-only storage (IndexedDB, private to your browser), or sign
in with Google / email to back up your trips and sync them across devices.

> On a phone, open the link and use **"Add to Home Screen"** to install it and
> use it offline like a native app.

## Tech

- **React + Vite**, TypeScript
- Installable PWA via `vite-plugin-pwa` (manifest + offline service worker)
- Offline-first storage: **Dexie** (IndexedDB) signed out, **Firebase/Firestore**
  signed in with offline persistence + sync; dates stored as `YYYY-MM-DD` with
  date-only math to avoid timezone bugs
- **Firebase Auth** (Google + Email/Password), optional accounts; the Firebase
  SDK is lazy-loaded so signed-out visitors don't download it
- **Vitest** for the 90/180 engine (see `src/lib/schengen.ts`)

## Configuration

Accounts require Firebase web config via `VITE_FIREBASE_*` env vars — copy
`.env.example` to `.env.local` for local dev, and set the same in Vercel for
production. Without them the app still runs fully in local-only mode. Firestore
access is governed by `firestore.rules` (each user can touch only their own trips).

## Project layout

The design and logic layers are deliberately separated so design changes never
touch the calculation, and vice versa (see `CLAUDE.md`):

- `src/lib/` — the 90/180 engine, date math, Dexie storage (logic)
- `src/theme/` — design tokens + presentational components (styling)
- `src/components/` — container components wiring the two together

## Develop

```bash
npm install
npm run dev        # start the dev server
npm test           # run the Vitest suite
npm run build      # production build to dist/
npm run preview    # serve the production build locally
npm run icons      # regenerate PWA icons from the SVG mark
```

## Deploy

Hosted on **Vercel** (framework preset: Vite, build `npm run build`, output
`dist`). Every push to `main` auto-deploys to production; branches and PRs get
their own preview URLs.
