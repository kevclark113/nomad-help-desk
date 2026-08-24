import { describe, it, expect } from 'vitest'
import { riskOf } from './status'
import type { SchengenStatus } from '../lib/schengen'

const base: SchengenStatus = {
  daysUsed: 0,
  daysRemaining: 90,
  windowStart: '2026-02-24',
  nextResetDate: null,
  projectedViolationDate: null,
}

const asOf = '2026-08-22'

describe('riskOf', () => {
  it('is "on track" with plenty of room and no projected breach', () => {
    expect(riskOf({ ...base, daysRemaining: 40 }, asOf)).toBe('on-track')
  })

  it('is "cutting it close" when few days remain', () => {
    expect(riskOf({ ...base, daysRemaining: 10 }, asOf)).toBe('close')
  })

  it('is "over" when already past the limit today', () => {
    expect(riskOf({ ...base, daysRemaining: -3 }, asOf)).toBe('over')
  })

  it('is "will exceed" when a recorded future trip breaches 90', () => {
    // Comfortable today, but a saved trip pushes over next month.
    expect(
      riskOf({ ...base, daysRemaining: 30, projectedViolationDate: '2026-09-20' }, asOf),
    ).toBe('will-exceed')
  })

  it('is "over" when the projected breach is today or already passed', () => {
    expect(
      riskOf({ ...base, daysRemaining: 5, projectedViolationDate: asOf }, asOf),
    ).toBe('over')
    expect(
      riskOf({ ...base, daysRemaining: 5, projectedViolationDate: '2026-08-01' }, asOf),
    ).toBe('over')
  })
})
