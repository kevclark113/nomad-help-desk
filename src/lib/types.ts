import type { ISODate } from './dateUtils'

/**
 * A single stay in the Schengen area.
 *
 * v1 assumes every trip is a US-passport tourist stay in the Schengen area,
 * so there's no per-country field yet. `countryCode`/`area` is the future hook
 * — intentionally not built now (see CLAUDE.md scope).
 */
export interface Trip {
  id?: number // auto-incremented by Dexie
  entryDate: ISODate // day entered the Schengen area (YYYY-MM-DD)
  exitDate: ISODate // day left (YYYY-MM-DD)
  note?: string // optional label
}
