/**
 * Generate PWA icons (192 & 512) from an inline SVG mark, rasterized with sharp.
 * Run: npm run icons
 *
 * Font-free by design — the mark is a coral 90/180 progress ring with shaded
 * teal/rose orbs, so it renders identically regardless of installed fonts.
 */
import sharp from 'sharp'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

const R = 120
const CIRC = 2 * Math.PI * R
const FILLED = 0.62 * CIRC // ~62% around, echoing the "62 / 90" design reference

const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg" cx="50%" cy="0%" r="120%">
      <stop offset="0" stop-color="#213249"/>
      <stop offset="0.6" stop-color="#131F2E"/>
    </radialGradient>
    <radialGradient id="teal" cx="32%" cy="28%" r="75%">
      <stop offset="0" stop-color="#9CE6EC"/>
      <stop offset="0.42" stop-color="#35B0BC"/>
      <stop offset="1" stop-color="#166069"/>
    </radialGradient>
    <radialGradient id="rose" cx="32%" cy="28%" r="75%">
      <stop offset="0" stop-color="#F6C2DC"/>
      <stop offset="0.42" stop-color="#DA6EA6"/>
      <stop offset="1" stop-color="#9A4573"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="${R}" fill="none" stroke="rgba(0,0,0,0.30)" stroke-width="34"/>
  <circle cx="256" cy="256" r="${R}" fill="none" stroke="#ED8A6F" stroke-width="34"
          stroke-linecap="round" stroke-dasharray="${FILLED.toFixed(1)} ${CIRC.toFixed(1)}"
          transform="rotate(-90 256 256)"/>
  <circle cx="388" cy="150" r="60" fill="url(#teal)"/>
  <circle cx="150" cy="378" r="38" fill="url(#rose)"/>
</svg>`

await mkdir(outDir, { recursive: true })
const buf = Buffer.from(svg)

for (const size of [192, 512]) {
  const out = join(outDir, `pwa-${size}.png`)
  await sharp(buf).resize(size, size).png().toFile(out)
  console.log(`wrote ${out}`)
}
