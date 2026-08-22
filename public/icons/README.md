# PWA icons

The manifest (`vite.config.ts`) references:

- `pwa-192.png` — 192×192
- `pwa-512.png` — 512×512 (also used as `maskable`)

These raw PNGs are **not yet added**. Until they exist, the install prompt
falls back to the SVG favicon and these paths 404. Drop the final icons here
(derived from the mural aesthetic in `DESIGN.md`) as part of the offline/polish
phase. `favicon.svg` in `public/` is the current placeholder mark.
