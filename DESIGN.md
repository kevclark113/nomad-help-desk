# Nomad Help Desk — Design System (DESIGN.md)

## North star
**Bold, dark, mural-inspired.** The references are a vivid coastal street-art mural (flowing organic shapes, saturated color blocks, heavy outlines) and a retro travel-poster. The app should carry that energy — dark saturated grounds, color blocks, shapes bleeding off edges, dimensional shaded orbs — **not** a conventional light-background app. Explicitly avoid the generic "saturated blue bar on a white card" social-app look.

## Palette
*(Hexes are eyeballed from the reference photos — tune freely.)*

| Role | Hex |
|---|---|
| Card / dark ground | `#17263B` (top-lit sheen `#213249` → `#131F2E`) |
| Paper / primary text on dark | `#F6F0E4` |
| Muted text | `#AEBACD` |
| Cobalt | `#2E7BCB` |
| Teal (orb) | `#35B0BC` |
| Coral (progress / heat) | `#ED8A6F` |
| Marigold (pills, dots, accents) | `#F3B33E` |
| Rose / pink (orb) | `#DA6EA6` |
| Olive (positive status) | `#9DBB44` |
| Plum | `#6A5A92` |

**Usage rule:** dark ground, color used as accents and shapes. Color frames the data; it never floods the reading area. The day-count numbers always stay high-contrast and calm.

## Shape & dimension
- Chunky rounded corners (20–22px).
- Organic circles/blobs **bleed off the card corners** (the mural's overlapping-shape feel).
- Orbs are shaded as **lit spheres** (lit from top-left): a darker base tone, a mid tone, and a bright highlight. In-app, use a CSS radial-gradient for the highlight and a soft box-shadow for depth. *(The chat previews faked this with stacked flat shapes; the real build can go softer/glossier.)* **Keep the shading + highlights — this is a deliberate choice, not flat.**

## The status card (centerpiece) — reference spec
- Dark navy card, rounded ~22px, subtle top sheen, soft drop shadow.
- **Teal orb** bleeding off the top-right corner; a **smaller rose orb** off the bottom-right. Both shaded with highlights.
- **Top row:** "Schengen area" (Paper, ~17px medium) left; a Marigold pill "rolling 90 / 180" (dark text) right.
- **Big count:** "62" large (~54px, Paper), a clear gap, then "/ 90 days used" (muted). An Olive "on track" chip sits far right.
- **Progress bar:** Coral fill (= days-used %) on a dark track, with a faint lighter sheen along the fill.
- **Footer:** a Marigold dot + "28 days left · 1 day frees up 12 Nov" (muted). When over, the dot + text turn Coral and read "over by N days"; when a saved future trip will breach, it reads "exceeds 90 on <date>". (We say "1 day frees up …", not "window resets" — only the single oldest day rolls off; it isn't a reset to zero.)
- **Status chip** wording scales with risk: "on track" (Olive) → "cutting it close" (Marigold) → "will exceed" (Coral, for a saved *future* breach) → "over" (Coral, currently over). A past overstay that has rolled out of the 180-day window is **not** shown as over — the chip reflects today's status. The trip that causes a breach also gets a Coral accent + "crosses 90 days on <date>" in the trips list.

## Panels & controls
Below the status card, each section (Add a trip, Your trips, Plan a trip, Account) is a subtle rounded **Panel** (faint translucent surface + hairline border) — quiet containers so the status card stays the hero. Controls live in `src/theme/components/ui.tsx`: dark-scheme inputs, pill Buttons (`solid` Cobalt / `ghost` / `danger` Coral). The **Account** panel is deliberately understated — "Continue with Google", an "or" divider, email/password, and a sign-in/create toggle; signed in it collapses to an Olive-dot "Synced across devices" line + Sign out. It's optional, so it must never shout over the calculator.

## Motion (cold-start only)
- On app launch **only** (never on every navigation): the two orbs **bounce into place** first (spring/overshoot, ~0.7s, small stagger between them), then the card's contents **drift up** into place (fade + slight upward translate, staggered). Whole sequence under ~1.3s.
- **Must honor `prefers-reduced-motion`:** when set, skip the animation and show everything instantly. Accessibility requirement, not optional.
- Implement with CSS keyframes (zero dependency) or Framer Motion if richer spring physics are wanted.

## Typography (direction — Jenn to finalize)
- **Headings & big numbers:** a characterful rounded/geometric display (candidates: Clash Display, Cabinet Grotesk, or a rounder Baloo).
- **Body & data:** a highly legible workhorse (Inter, DM Sans).
- The contrast — expressive headers, boringly-legible data — is what keeps it bold *and* readable.

## Where design lives in the code
All of the above becomes a single source of truth in the theme/tokens layer (`src/theme/`): color tokens, radii, spacing, type scale, motion timings. Change the look here; the calculator logic never needs to know.
