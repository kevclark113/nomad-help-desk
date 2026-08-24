/**
 * The Schengen rolling 90/180 rule — pure, tested functions.
 *
 * Correctness is non-negotiable here: overstaying has real consequences.
 * No `Date` objects, no timezones — everything runs on inclusive calendar-day
 * math over `YYYY-MM-DD` strings (see dateUtils).
 *
 * The rule: within any rolling window of 180 days, a US tourist may be present
 * in the Schengen area for at most 90 days. Both the entry day and the exit day
 * count as days present (inclusive counting).
 */

import type { TripDates } from './types'
import {
  addDays,
  fromDayNumber,
  toDayNumber,
  type ISODate,
} from './dateUtils'

/** Length of the rolling window, in days. */
export const WINDOW_DAYS = 180
/** Maximum days of presence allowed within any window. */
export const LIMIT_DAYS = 90

export interface SchengenStatus {
  /** Days present within the 180-day window ending on `asOf` (inclusive). */
  daysUsed: number
  /** `90 - daysUsed`. Negative when already over. */
  daysRemaining: number
  /** First day of the current window: `asOf - 179`. */
  windowStart: ISODate
  /**
   * Soonest date on which `daysRemaining` increases because a used day rolls
   * out of the window. `null` when no days are currently used.
   */
  nextResetDate: ISODate | null
  /**
   * First date (given the recorded trips, including future-dated ones) on which
   * presence in the trailing 180-day window would exceed 90. `null` if never.
   */
  projectedViolationDate: ISODate | null
}

export interface PlannedTripCheck {
  /** Would adding this trip push any rolling window over 90 days? */
  wouldExceed: boolean
  /** First date the combined history would exceed 90, or `null`. */
  firstViolationDate: ISODate | null
  /**
   * Latest exit date for the given planned entry that stays within the limit.
   * `null` when even the entry day itself already violates.
   */
  latestSafeExitDate: ISODate | null
}

type Interval = { start: number; end: number } // inclusive day numbers

/** Convert trips to sorted, merged inclusive day-number intervals. */
function mergedIntervals(trips: readonly TripDates[]): Interval[] {
  const intervals = trips
    .map((t) => ({ start: toDayNumber(t.entryDate), end: toDayNumber(t.exitDate) }))
    .filter((iv) => iv.end >= iv.start)
    .sort((a, b) => a.start - b.start)

  const merged: Interval[] = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    // Merge on overlap OR contiguity (next starts the day after prev ends).
    if (last && iv.start <= last.end + 1) {
      last.end = Math.max(last.end, iv.end)
    } else {
      merged.push({ ...iv })
    }
  }
  return merged
}

/** Days present within the window ending on `asOf` (inclusive), given merged intervals. */
function daysUsedOn(merged: Interval[], asOf: number): number {
  const windowStart = asOf - (WINDOW_DAYS - 1)
  let total = 0
  for (const iv of merged) {
    const lo = Math.max(iv.start, windowStart)
    const hi = Math.min(iv.end, asOf)
    if (hi >= lo) total += hi - lo + 1
  }
  return total
}

/** All present day-numbers, ascending, across merged intervals. */
function* presentDays(merged: Interval[]): Generator<number> {
  for (const iv of merged) {
    for (let d = iv.start; d <= iv.end; d++) yield d
  }
}

/**
 * First present day whose trailing-180 window exceeds the limit, or `null`.
 * Presence-count for a trailing window is maximized on a present day, so it's
 * sufficient to test present days in ascending order.
 */
function firstViolation(merged: Interval[]): number | null {
  for (const d of presentDays(merged)) {
    if (daysUsedOn(merged, d) > LIMIT_DAYS) return d
  }
  return null
}

export function schengenStatus(trips: readonly TripDates[], asOf: ISODate): SchengenStatus {
  const merged = mergedIntervals(trips)
  const asOfNum = toDayNumber(asOf)
  const windowStartNum = asOfNum - (WINDOW_DAYS - 1)

  const daysUsed = daysUsedOn(merged, asOfNum)

  // Earliest present day still inside the current window; it rolls out (and
  // frees a day) once asOf reaches that day + 180.
  let nextResetDate: ISODate | null = null
  for (const iv of merged) {
    const lo = Math.max(iv.start, windowStartNum)
    const hi = Math.min(iv.end, asOfNum)
    if (hi >= lo) {
      nextResetDate = fromDayNumber(lo + WINDOW_DAYS)
      break
    }
  }

  const violation = firstViolation(merged)

  return {
    daysUsed,
    daysRemaining: LIMIT_DAYS - daysUsed,
    windowStart: fromDayNumber(windowStartNum),
    nextResetDate,
    projectedViolationDate: violation === null ? null : fromDayNumber(violation),
  }
}

export function checkPlannedTrip(
  trips: readonly TripDates[],
  plannedEntry: ISODate,
  plannedExit: ISODate,
): PlannedTripCheck {
  const planned: TripDates = { entryDate: plannedEntry, exitDate: plannedExit }
  const combined = mergedIntervals([...trips, planned])

  const violation = firstViolation(combined)
  const wouldExceed = violation !== null

  // Latest safe exit: extend the planned stay day-by-day from the entry until
  // the combined history first violates; the day before is the last safe exit.
  const entryNum = toDayNumber(plannedEntry)
  let latestSafeExitDate: ISODate | null = null
  // If even the single entry day violates, there is no safe exit.
  const entryOnly = mergedIntervals([
    ...trips,
    { entryDate: plannedEntry, exitDate: plannedEntry },
  ])
  if (firstViolation(entryOnly) === null) {
    // Walk forward until a violation appears.
    let cursor = entryNum
    // Guard the loop with a full window's worth of headroom past the entry.
    const hardStop = entryNum + WINDOW_DAYS + LIMIT_DAYS
    while (cursor <= hardStop) {
      const trial = mergedIntervals([
        ...trips,
        { entryDate: plannedEntry, exitDate: fromDayNumber(cursor) },
      ])
      if (firstViolation(trial) !== null) break
      latestSafeExitDate = fromDayNumber(cursor)
      cursor++
    }
  }

  return {
    wouldExceed,
    firstViolationDate: violation === null ? null : fromDayNumber(violation),
    latestSafeExitDate,
  }
}

/** Small helper for UI: the last day of the window ending `WINDOW_DAYS` after a date. */
export function windowEndAfter(date: ISODate): ISODate {
  return addDays(date, WINDOW_DAYS - 1)
}
