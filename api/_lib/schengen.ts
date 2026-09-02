/**
 * Schengen Area alpha-2 codes (server copy of src/lib/schengenCountries.ts).
 * Trips to these count toward the 90/180 limit and are stored as tracker trips;
 * everything else is a visited-map mark only.
 */
export const SCHENGEN_CODES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IS', 'IT', 'LV',
  'LI', 'LT', 'LU', 'MT', 'NL', 'NO', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'CH',
])

export function isSchengen(code: string | undefined | null): boolean {
  return !!code && SCHENGEN_CODES.has(code.toUpperCase())
}
