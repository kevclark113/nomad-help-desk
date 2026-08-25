/**
 * The Schengen Area member states (ISO 3166-1 alpha-2 + display name).
 *
 * Used by the trip-editor country picker so every logged trip is a Schengen
 * stay — that keeps the 90/180 engine correct (it counts all trips). Bulgaria
 * and Romania are included (joined the Schengen Area in 2024–2025).
 *
 * Non-Schengen countries are never entered here; they get marked visited by
 * tapping the map (see the visited-countries feature).
 */
export interface Country {
  code: string // alpha-2, uppercase
  name: string
}

export const SCHENGEN_COUNTRIES: readonly Country[] = [
  { code: 'AT', name: 'Austria' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'HR', name: 'Croatia' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'EE', name: 'Estonia' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'IT', name: 'Italy' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MT', name: 'Malta' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NO', name: 'Norway' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'RO', name: 'Romania' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'ES', name: 'Spain' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
] as const

const NAME_BY_CODE: Record<string, string> = Object.fromEntries(
  SCHENGEN_COUNTRIES.map((c) => [c.code, c.name]),
)

/** Display name for a Schengen alpha-2 code, or the code itself if unknown. */
export function schengenName(code: string | undefined): string | undefined {
  if (!code) return undefined
  return NAME_BY_CODE[code.toUpperCase()] ?? code.toUpperCase()
}
