# Nomad Help Desk

A **Schengen 90/180 day calculator** for US travelers. Log your Schengen-area
trips and see how many of your 90 days you've used, how many remain, when the
window resets, and whether a planned trip would push you over.

**Live app:** https://nomadhelpdesk.vercel.app

It's a **local-first, installable PWA** — no accounts, no server, works offline.
Your trips are stored privately in your own browser (IndexedDB); nothing is
shared or synced between devices.

> On a phone, open the link and use **"Add to Home Screen"** to install it and
> use it offline like a native app.

## Tech

- **React + Vite**, TypeScript
- Installable PWA via `vite-plugin-pwa` (manifest + offline service worker)
- Local-first storage with **Dexie** (IndexedDB); dates stored as `YYYY-MM-DD`
  with date-only math to avoid timezone bugs
- **Vitest** for the 90/180 engine (see `src/lib/schengen.ts`)

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
