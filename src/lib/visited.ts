/**
 * Pure logic for the visited-countries map: which countries are visited, and
 * per-country aggregates from trips. No storage or rendering concerns here.
 *
 * Codes are ISO 3166-1 alpha-2, normalized to uppercase. Dates are `YYYY-MM-DD`
 * strings, which sort chronologically as plain strings.
 */
import type { Trip, MarkStatus } from './types'
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

export interface CountryClassification {
  /** Been there: a past/ongoing trip, or manually marked visited. */
  visited: Set<string>
  /** Only a future trip on record (and not already visited). */
  upcoming: Set<string>
  /** Want to go: manually marked bucket-list (and not visited/upcoming). */
  bucket: Set<string>
}

/**
 * Classify visited-map countries as of `today`, with precedence
 * visited > upcoming > bucket:
 * - visited: a trip with entry date today-or-earlier, or a manual 'visited' mark
 * - upcoming: only a future trip on record
 * - bucket: a manual 'bucket' mark
 *
 * `marks` maps alpha-2 code → manual status.
 */
export function classifyCountries(
  trips: readonly Trip[],
  marks: ReadonlyMap<string, MarkStatus>,
  today: ISODate,
): CountryClassification {
  const visited = new Set<string>()
  const upcoming = new Set<string>()
  const bucket = new Set<string>()

  for (const [code, status] of marks) {
    const c = normalizeCode(code)
    if (status === 'visited') visited.add(c)
    else if (status === 'bucket') bucket.add(c)
  }
  for (const t of trips) {
    if (!t.countryCode) continue
    const code = normalizeCode(t.countryCode)
    if (t.entryDate <= today) visited.add(code)
    else upcoming.add(code)
  }

  // Enforce precedence: visited > upcoming > bucket.
  for (const c of visited) {
    upcoming.delete(c)
    bucket.delete(c)
  }
  for (const c of upcoming) bucket.delete(c)

  return { visited, upcoming, bucket }
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
