/**
 * ISO 3166-1 lookups joining our alpha-2 codes to the world-atlas TopoJSON,
 * whose polygon ids are NUMERIC codes. Match on code, never on name.
 *
 * Data is generated — see scripts/gen-iso.mjs (`npm run iso`).
 */
import { ISO_COUNTRIES, type IsoCountry } from './isoCountries.data'

export type { IsoCountry }

/** Normalize an atlas numeric id (number or string) to a zero-padded 3-char string. */
function normNumeric(numeric: string | number): string {
  return String(numeric).padStart(3, '0')
}

const byNumeric = new Map<string, IsoCountry>(ISO_COUNTRIES.map((c) => [c.numeric, c]))
const byAlpha2 = new Map<string, IsoCountry>(ISO_COUNTRIES.map((c) => [c.a2, c]))

export function numericToAlpha2(numeric: string | number): string | undefined {
  return byNumeric.get(normNumeric(numeric))?.a2
}

export function alpha2ToNumeric(a2: string): string | undefined {
  return byAlpha2.get(a2.toUpperCase())?.numeric
}

export function nameForAlpha2(a2: string): string | undefined {
  return byAlpha2.get(a2.toUpperCase())?.name
}

export function nameForNumeric(numeric: string | number): string | undefined {
  return byNumeric.get(normNumeric(numeric))?.name
}
