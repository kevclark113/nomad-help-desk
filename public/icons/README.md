# PWA icons

`pwa-192.png` and `pwa-512.png` are **generated** from an inline SVG mark by
`scripts/gen-icons.mjs` (a coral 90/180 progress ring with shaded teal/rose
orbs — font-free, so it rasterizes identically anywhere).

Regenerate after changing the mark:

```
npm run icons
```

The manifest (`vite.config.ts`) references both, and uses the 512 as the
`maskable` icon. `public/favicon.svg` is the matching browser-tab mark.
