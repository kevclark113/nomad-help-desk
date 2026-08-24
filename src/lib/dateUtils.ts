/**
 * Date-only math on `YYYY-MM-DD` strings.
 *
 * We deliberately avoid JS `Date` objects for storage and counting to sidestep
 * timezone off-by-one bugs (a `Date` is an instant in time; a calendar day is not).
 * All functions here treat a date as a plain calendar day.
 */

/** A calendar date in ISO `YYYY-MM-DD` form. */
export type ISODate = string

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidISODate(s: string): boolean {
  if (!ISO_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  if (m < 1 || m > 12) return false
  if (d < 1 || d > daysInMonth(y, m)) return false
  return true
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12
  return [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

/** Days since a fixed epoch — a monotonic integer for date arithmetic. */
export function toDayNumber(date: ISODate): number {
  const [y, m, d] = date.split('-').map(Number)
  // Use UTC to keep the count timezone-independent; we only ever read the
  // difference between two such numbers, never convert back to a wall clock.
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

export function fromDayNumber(dayNumber: number): ISODate {
  const dt = new Date(dayNumber * 86_400_000)
  const y = dt.getUTCFullYear()
  const m = dt.getUTCMonth() + 1
  const d = dt.getUTCDate()
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`
}

/** Whole days from `a` to `b` (b - a). Negative if b precedes a. */
export function daysBetween(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a)
}

export function addDays(date: ISODate, n: number): ISODate {
  return fromDayNumber(toDayNumber(date) + n)
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return toDayNumber(a) <= toDayNumber(b) ? a : b
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return toDayNumber(a) >= toDayNumber(b) ? a : b
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Format an ISO date for display, e.g. `2026-11-12` → `12 Nov` (or `12 Nov 2026`). */
export function formatHuman(date: ISODate, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number)
  const base = `${d} ${MONTHS_SHORT[m - 1]}`
  return withYear ? `${base} ${y}` : base
}

/** Inclusive day count for a trip: both entry and exit days count. */
export function inclusiveDays(entry: ISODate, exit: ISODate): number {
  return daysBetween(entry, exit) + 1
}

/** Today as an ISO date in the user's local timezone. */
export function todayISO(): ISODate {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const d = now.getDate()
  return `${y.toString().padStart(4, '0')}-${m.toString().padStart(2, '0')}-${d
    .toString()
    .padStart(2, '0')}`
}
