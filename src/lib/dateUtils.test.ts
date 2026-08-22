import { describe, it, expect } from 'vitest'
import {
  addDays,
  daysBetween,
  isLeapYear,
  isValidISODate,
  toDayNumber,
  fromDayNumber,
} from './dateUtils'

describe('dateUtils', () => {
  it('validates ISO dates', () => {
    expect(isValidISODate('2026-02-28')).toBe(true)
    expect(isValidISODate('2026-02-29')).toBe(false) // not a leap year
    expect(isValidISODate('2024-02-29')).toBe(true) // leap year
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2026-1-1')).toBe(false)
  })

  it('knows leap years', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2100)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
  })

  it('counts days between dates inclusively via day numbers', () => {
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    // across a leap day
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
  })

  it('round-trips through day numbers', () => {
    const d = '2026-08-22'
    expect(fromDayNumber(toDayNumber(d))).toBe(d)
  })

  it('adds days across month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
