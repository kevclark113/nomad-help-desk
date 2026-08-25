/**
 * Pure logic for the visited-countries map: which countries are visited, and
 * per-country aggregates from trips. No storage or rendering concerns here.
 *
 * Codes are ISO 3166-1 alpha-2, normalized to uppercase. Dates are `YYYY-MM-DD`
 * strings, which sort chronologically as plain strings.
 */
import type { Trip } from './types'
import { inclusiveDays, type ISODate } from './dateUtils'

export interface CountryStat {
  code: string
  /** Total days present across trips to this country (inclusive counting). */
  days: number
  /** Number of trips recorded to this country. */
  trips: number
  firstEntry: ISODate
  lastExit: ISODate
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

/**
 * The set of visited country codes: countries tagged on trips, unioned with
 * countries the user toggled manually. Trips without a `countryCode` don't
 * contribute (they're generic Schengen stays with no country tag).
 */
export function visitedCodes(trips: readonly Trip[], manual: Iterable<string>): Set<string> {
  const set = new Set<string>()
  for (const t of trips) if (t.countryCode) set.add(normalizeCode(t.countryCode))
  for (const c of manual) if (c) set.add(normalizeCode(c))
  return set
}

/** Aggregate trips (only those with a country) by country code. */
export function countryStats(trips: readonly Trip[]): Map<string, CountryStat> {
  const byCode = new Map<string, CountryStat>()
  for (const t of trips) {
    if (!t.countryCode) continue
    const code = normalizeCode(t.countryCode)
    const days = inclusiveDays(t.entryDate, t.exitDate)
    const cur = byCode.get(code)
    if (!cur) {
      byCode.set(code, {
        code,
        days,
        trips: 1,
        firstEntry: t.entryDate,
        lastExit: t.exitDate,
      })
    } else {
      cur.days += days
      cur.trips += 1
      if (t.entryDate < cur.firstEntry) cur.firstEntry = t.entryDate
      if (t.exitDate > cur.lastExit) cur.lastExit = t.exitDate
    }
  }
  return byCode
}
