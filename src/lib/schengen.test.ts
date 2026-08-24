import { describe, it, expect } from 'vitest'
import { schengenStatus, checkPlannedTrip, WINDOW_DAYS, LIMIT_DAYS } from './schengen'
import { addDays } from './dateUtils'
import type { TripDates } from './types'

const trip = (entryDate: string, exitDate: string): TripDates => ({
  entryDate,
  exitDate,
})

describe('schengenStatus — basics', () => {
  it('empty history: nothing used, full allowance, no reset or violation', () => {
    const s = schengenStatus([], '2026-08-22')
    expect(s.daysUsed).toBe(0)
    expect(s.daysRemaining).toBe(LIMIT_DAYS)
    expect(s.nextResetDate).toBeNull()
    expect(s.projectedViolationDate).toBeNull()
    // window is 180 days ending on asOf → starts 179 days earlier
    expect(s.windowStart).toBe(addDays('2026-08-22', -(WINDOW_DAYS - 1)))
  })

  it('single-day trip (entry === exit) counts as one day', () => {
    const s = schengenStatus([trip('2026-01-10', '2026-01-10')], '2026-01-10')
    expect(s.daysUsed).toBe(1)
    expect(s.daysRemaining).toBe(89)
    // that one used day rolls out of the window 180 days later
    expect(s.nextResetDate).toBe(addDays('2026-01-10', WINDOW_DAYS))
  })

  it('counts entry and exit days inclusively', () => {
    // Jan 1..Jan 10 inclusive = 10 days
    const s = schengenStatus([trip('2026-01-01', '2026-01-10')], '2026-01-10')
    expect(s.daysUsed).toBe(10)
  })
})

describe('schengenStatus — exactly at the limit', () => {
  it('a trip that exactly hits 90 days is allowed (no violation)', () => {
    // 2026-01-01 .. 2026-03-31 = 31 + 28 + 31 = 90 days (2026 is not a leap year)
    const s = schengenStatus([trip('2026-01-01', '2026-03-31')], '2026-03-31')
    expect(s.daysUsed).toBe(90)
    expect(s.daysRemaining).toBe(0)
    expect(s.projectedViolationDate).toBeNull()
  })

  it('a 91-day trip violates on the 91st day', () => {
    const s = schengenStatus([trip('2026-01-01', '2026-04-01')], '2026-04-01')
    expect(s.daysUsed).toBe(91)
    expect(s.daysRemaining).toBe(-1)
    expect(s.projectedViolationDate).toBe('2026-04-01')
  })
})

describe('schengenStatus — leap years', () => {
  it('counts Feb 29 in a leap year', () => {
    // 2024-02-01 .. 2024-02-29 inclusive = 29 days
    const s = schengenStatus([trip('2024-02-01', '2024-02-29')], '2024-02-29')
    expect(s.daysUsed).toBe(29)
  })

  it('non-leap February has 28 days', () => {
    const s = schengenStatus([trip('2026-02-01', '2026-02-28')], '2026-02-28')
    expect(s.daysUsed).toBe(28)
  })
})

describe('schengenStatus — overlapping and back-to-back trips', () => {
  it('back-to-back (contiguous) trips do not double-count the seam', () => {
    const trips = [trip('2026-01-01', '2026-01-10'), trip('2026-01-11', '2026-01-20')]
    const s = schengenStatus(trips, '2026-01-20')
    expect(s.daysUsed).toBe(20)
  })

  it('overlapping trips are de-duplicated', () => {
    const trips = [trip('2026-01-01', '2026-01-10'), trip('2026-01-05', '2026-01-15')]
    const s = schengenStatus(trips, '2026-01-15')
    expect(s.daysUsed).toBe(15) // union Jan 1..15, not 10 + 11
  })
})

describe('schengenStatus — 180-day window boundary', () => {
  it('only days inside the trailing window are counted', () => {
    // Trip Jan 1..Jan 31 (31 days). Choose asOf so the window starts on Jan 15.
    const asOf = addDays('2026-01-15', WINDOW_DAYS - 1)
    const s = schengenStatus([trip('2026-01-01', '2026-01-31')], asOf)
    // Only Jan 15..Jan 31 fall inside the window = 17 days
    expect(s.daysUsed).toBe(17)
    expect(s.windowStart).toBe('2026-01-15')
  })

  it('a day exactly WINDOW_DAYS-1 before asOf is still counted', () => {
    const asOf = '2026-06-30'
    const oldestInWindow = addDays(asOf, -(WINDOW_DAYS - 1))
    const s = schengenStatus([trip(oldestInWindow, oldestInWindow)], asOf)
    expect(s.daysUsed).toBe(1)
  })

  it('a day one older than the window is excluded', () => {
    const asOf = '2026-06-30'
    const justOutside = addDays(asOf, -WINDOW_DAYS)
    const s = schengenStatus([trip(justOutside, justOutside)], asOf)
    expect(s.daysUsed).toBe(0)
  })
})

describe('schengenStatus — nextResetDate', () => {
  it('is the earliest in-window present day plus 180', () => {
    const s = schengenStatus([trip('2026-01-01', '2026-03-31')], '2026-03-31')
    // earliest present day in window is the trip start
    expect(s.nextResetDate).toBe(addDays('2026-01-01', WINDOW_DAYS))
  })
})

describe('checkPlannedTrip', () => {
  it('a planned trip that fits does not exceed, and reports a safe exit', () => {
    const res = checkPlannedTrip([], '2026-01-01', '2026-01-10')
    expect(res.wouldExceed).toBe(false)
    expect(res.firstViolationDate).toBeNull()
    // with no other trips, a stay can be at most 90 days → latest safe exit is entry + 89
    expect(res.latestSafeExitDate).toBe(addDays('2026-01-01', LIMIT_DAYS - 1))
  })

  it('flags a planned trip that busts the 90-day limit and gives the first date', () => {
    // Existing 85 days, then a contiguous 10-day plan → 95 combined
    const existing = [trip('2026-01-01', '2026-03-26')] // 85 days
    const res = checkPlannedTrip(existing, '2026-03-27', '2026-04-05')
    expect(res.wouldExceed).toBe(true)
    expect(res.firstViolationDate).toBe('2026-04-01') // the 91st combined day
    expect(res.latestSafeExitDate).toBe('2026-03-31') // last day still at 90
  })

  it('returns no safe exit when the entry day itself already violates', () => {
    // 90 days already used ending the day before the planned entry, all in-window
    const existing = [trip('2026-01-02', '2026-04-01')] // 90 days
    const res = checkPlannedTrip(existing, '2026-04-02', '2026-04-10')
    expect(res.wouldExceed).toBe(true)
    expect(res.latestSafeExitDate).toBeNull()
  })
})
