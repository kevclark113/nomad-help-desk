import type { ISODate } from './dateUtils'

/**
 * A single stay in the Schengen area.
 *
 * `id` is a string so the same shape works in both Dexie (local) and Firestore
 * (cloud). v1 assumes every trip is a US-passport tourist stay in the Schengen
 * area, so there's no per-country field yet — that's the future hook.
 */
export interface Trip {
  id: string
  entryDate: ISODate // day entered the Schengen area (YYYY-MM-DD)
  exitDate: ISODate // day left (YYYY-MM-DD)
  note?: string // optional label
  /**
   * Optional ISO 3166-1 alpha-2 country code (uppercase, e.g. "PT"). In the
   * Schengen tracker the picker offers only Schengen-area countries, so every
   * trip stays a Schengen stay and the 90/180 engine is unaffected. Used to
   * mark/shade countries on the visited-countries map.
   */
  countryCode?: string
}

/** A trip being created — the store assigns the id. */
export type NewTrip = Omit<Trip, 'id'>

/** The minimal shape the 90/180 engine needs. */
export type TripDates = Pick<Trip, 'entryDate' | 'exitDate'>

/** A country the user marked visited directly (e.g. by tapping the map). */
export interface VisitedCountry {
  code: string // ISO 3166-1 alpha-2, uppercase
  addedAt?: ISODate
}
