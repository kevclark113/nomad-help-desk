/**
 * Design tokens — the single source of truth for the app's look.
 * Owned by the design layer (Jenn). See DESIGN.md.
 *
 * Nothing in src/lib/ imports this file, and this file imports no app logic.
 * Change the look here; the calculator never needs to know.
 */

export const color = {
  // Card / dark ground (top-lit sheen runs #213249 -> #131F2E)
  ground: '#17263B',
  groundSheenTop: '#213249',
  groundSheenBottom: '#131F2E',

  // Text
  paper: '#F6F0E4', // primary text on dark
  muted: '#AEBACD',

  // Accents / shapes
  cobalt: '#2E7BCB',
  teal: '#35B0BC', // orb
  coral: '#ED8A6F', // progress / heat
  marigold: '#F3B33E', // pills, dots, accents
  rose: '#DA6EA6', // orb
  olive: '#9DBB44', // positive status
  plum: '#6A5A92',
} as const

/**
 * "Schengen Zone" card palette — the wide, earth-illustration hero.
 * A separate, brighter world from the base tokens above (navy + blue glow,
 * amber/lime/coral accents). See the Schengen Zone design study.
 */
export const zone = {
  navyTop: '#1a2942',
  navyBottom: '#111d31',
  trackBg: '#0c1626',
  blueGlow: '#3b82f6',
  coral: '#f2765b',
  amber: '#f2c94c',
  lime: '#a4d65e',
  mutedA: '#8ea0bd',
  mutedB: '#9fb0cc',
} as const

/**
 * Visited-countries map palette. `visited` is the flat "been here" fill (Phase 2);
 * a day-intensity scale will layer on later. Ocean is left to the page navy.
 */
export const map = {
  land: '#22344d', // unvisited land — a muted tone on the dark ground
  landStroke: '#0e1a2b', // country borders
  visited: '#f2c94c', // been there (amber, echoing the Zone card)
  upcoming: '#35b0bc', // a future trip on record (teal — distinct from visited)
} as const

export const radius = {
  card: '22px',
  chunky: '20px',
  pill: '999px',
} as const

export const space = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
} as const

export const type = {
  display: "'Baloo 2', 'Clash Display', 'Cabinet Grotesk', system-ui, sans-serif",
  zoneDisplay: "'Manrope', 'Inter', system-ui, sans-serif",
  body: "'Inter', 'DM Sans', system-ui, sans-serif",
  bigCount: '54px',
  heading: '17px',
} as const

export const motion = {
  // Cold-start entrance only. Honor prefers-reduced-motion at call sites.
  orbBounce: '0.7s',
  orbStagger: '0.12s',
  contentDrift: '0.4s',
  sequenceMax: '1.3s',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const

export const theme = { color, zone, map, radius, space, type, motion } as const
export type Theme = typeof theme
